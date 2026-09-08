#!/usr/bin/env python3
"""
TDrive Migration: Private Channel → Saved Messages

One-time migration script for existing TDrive installs that used a private
Telegram channel as the storage backend.  Reads the current config, connects
to Telegram with the existing session, scans Saved Messages for all known
caption formats, and updates config.json to the "me" (Saved Messages) target.

Usage:
    python -m scripts.migrate_to_saved_messages           # perform migration
    python -m scripts.migrate_to_saved_messages --dry-run # preview only
"""

import asyncio
import base64
import hashlib
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import typer
from rich.console import Console
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, AuthKeyError

from core.session import SessionManager
from core.recovery import MetadataV1Parser, PstreamCaptionParser

logger = logging.getLogger("migrate")
console = Console()

app = typer.Typer(help="Migrate TDrive from a private channel to Saved Messages.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_config(sm: SessionManager) -> Dict[str, Any]:
    try:
        return sm.load_config()
    except Exception as exc:
        console.print(f"[red]Failed to read config: {exc}[/red]")
        raise typer.Exit(1)


def _connect_client(config: Dict[str, Any], session_path: Path) -> TelegramClient:
    """Create and connect a Telethon client; exit on auth/session failure."""
    api_id = config.get("api_id")
    api_hash = config.get("api_hash")
    if not api_id or not api_hash:
        console.print("[red]Config is missing api_id/api_hash. Run `tdrive init` first.[/red]")
        raise typer.Exit(1)

    client = TelegramClient(str(session_path), api_id, api_hash)
    return client


def _regenerate_fingerprint(config: Dict[str, Any], sm: SessionManager) -> Optional[str]:
    """Regenerate the integrity fingerprint for 'saved_messages' target."""
    if "integrity" not in config or "fingerprint" not in config.get("integrity", {}):
        return None

    from core.integrity import IntegrityGuard
    guard = IntegrityGuard(sm)
    new_fp = guard.generate_fingerprint()
    return new_fp


def _parse_caption(text: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Identify a message's caption type.  Returns a dict with at least a 'type' key,
    or None if the message is not a recognized TDrive storage message.
    """
    if not text:
        return None

    # tdrive:v1: (encrypted drive chunks — base64 signed payload)
    if text.startswith("tdrive:v1:"):
        parser = MetadataV1Parser()
        meta = parser.parse(text)
        if meta:
            meta["type"] = "drive"
            return meta
        return {"type": "drive", "parse_error": True}

    # tstream: (stream recordings)
    if text.startswith("tstream:"):
        return {"type": "stream", "raw": text}

    # ts3: (s3 objects)
    if text.startswith("ts3:"):
        return {"type": "s3", "raw": text}

    # pstream legacy: profile/stem[_partNNN]
    pstream_parser = PstreamCaptionParser()
    pstream_meta = pstream_parser.parse(text)
    if pstream_meta:
        return pstream_meta

    return None


# ---------------------------------------------------------------------------
# Core migration logic
# ---------------------------------------------------------------------------

async def _run_migration(dry_run: bool) -> None:
    sm = SessionManager()
    config = _load_config(sm)
    session_path = sm.config_dir / "tdrive.session"

    # --- Pre-flight checks ---------------------------------------------------
    if not session_path.exists():
        console.print("[red]No Telegram session file found. Run `tdrive login` first.[/red]")
        raise typer.Exit(1)

    old_channel_id = config.get("channel_id")
    if old_channel_id is None and "channel_id" not in config:
        # Check if there's a nested channel_id in a different location
        pass

    if old_channel_id is None:
        console.print("[yellow]Config has no `channel_id` — appears already migrated.[/yellow]")
        console.print("[dim]Continuing to scan Saved Messages for verification...[/dim]")

    # --- Connect to Telegram --------------------------------------------------
    client = _connect_client(config, session_path)
    console.print("[bold cyan]Connecting to Telegram...[/bold cyan]")

    try:
        await client.connect()
        if not await client.is_user_authorized():
            console.print("[red]Telegram session is not authorized. Run `tdrive login`.[/red]")
            await client.disconnect()
            raise typer.Exit(1)

        me = await client.get_me()
        console.print(f"[green]Authenticated as {me.first_name} (id={me.id})[/green]")
    except (AuthKeyError, SessionPasswordNeededError) as exc:
        console.print(f"[red]Telegram session error: {exc}[/red]")
        console.print("[dim]Try running `tdrive login` to re-authenticate.[/dim]")
        await client.disconnect()
        raise typer.Exit(1)
    except Exception as exc:
        console.print(f"[red]Failed to connect to Telegram: {exc}[/red]")
        await client.disconnect()
        raise typer.Exit(1)

    # --- Scan Saved Messages --------------------------------------------------
    console.print("[bold]Scanning Saved Messages...[/bold]")

    v1_parser = MetadataV1Parser()
    pstream_parser = PstreamCaptionParser()

    stats: Dict[str, int] = {
        "scanned": 0,
        "drive_files": 0,
        "streams": 0,
        "s3_objects": 0,
        "pstream_legacy": 0,
        "unrecognized": 0,
        "errors": 0,
    }
    # Track unique drive file IDs seen
    seen_drive_fids: set = set()
    seen_stream_stems: set = set()

    try:
        async for message in client.iter_messages("me"):
            stats["scanned"] += 1
            if stats["scanned"] % 50 == 0:
                console.print(f"  [dim]...{stats['scanned']} messages scanned[/dim]")

            caption_info = _parse_caption(message.text)
            if caption_info is None:
                continue

            msg_type = caption_info.get("type")

            try:
                if msg_type == "drive":
                    fid = caption_info.get("fid")
                    if fid and fid not in seen_drive_fids:
                        seen_drive_fids.add(fid)
                        stats["drive_files"] += 1
                elif msg_type == "stream":
                    stats["streams"] += 1
                elif msg_type == "s3":
                    stats["s3_objects"] += 1
                elif msg_type == "pstream":
                    stem = f"{caption_info.get('profile', '?')}/{caption_info.get('stem', '?')}"
                    if stem not in seen_stream_stems:
                        seen_stream_stems.add(stem)
                    stats["pstream_legacy"] += 1
            except Exception as exc:
                logger.debug(f"Error classifying message {message.id}: {exc}")
                stats["errors"] += 1

    except Exception as exc:
        console.print(f"[red]Error during scan: {exc}[/red]")
        stats["errors"] += 1
    finally:
        await client.disconnect()

    # --- Update config --------------------------------------------------------
    if old_channel_id is not None and not dry_run:
        config.pop("channel_id", None)
        fp = _regenerate_fingerprint(config, sm)
        if fp:
            config.setdefault("integrity", {})["fingerprint"] = fp
        sm.save_config(config)
        console.print("[green]Config updated: removed `channel_id`, regenerated fingerprint.[/green]")
    elif old_channel_id is not None and dry_run:
        console.print("[yellow](dry-run) Would remove `channel_id` and regenerate fingerprint.[/yellow]")
    elif old_channel_id is None:
        console.print("[dim]No channel_id to remove.[/dim]")

    # --- Summary --------------------------------------------------------------
    console.print()
    console.print("[bold]Migration Summary[/bold]")
    console.print(f"  Messages scanned:     {stats['scanned']}")
    console.print(f"  Drive files found:    {stats['drive_files']}")
    console.print(f"  Stream entries:       {stats['streams']}")
    console.print(f"  S3 objects:           {stats['s3_objects']}")
    console.print(f"  Pstream legacy:       {stats['pstream_legacy']}")
    console.print(f"  Errors:               {stats['errors']}")

    if dry_run:
        console.print("\n[yellow]Dry run — no changes were written.[/yellow]")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

@app.command()
def migrate(
    dry_run: bool = typer.Option(False, "--dry-run", "-n", help="Preview the migration without changing anything"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging"),
) -> None:
    """Migrate TDrive from a private Telegram channel to Saved Messages."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )

    if dry_run:
        console.print("[bold yellow]DRY RUN — nothing will be changed.[/bold yellow]\n")

    asyncio.run(_run_migration(dry_run))


if __name__ == "__main__":
    app()
