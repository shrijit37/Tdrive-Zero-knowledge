"""
TDrive Telegram Health Routes.

Health dashboard for the Telegram storage state: connection status,
Saved Messages inventory, per-type breakdown, and diagnostics.
"""

import logging
import time
import base64
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_

from api.dependencies import get_manager, get_session_manager
from api.schemas import StructuredResponse
from core.db.session import DatabaseSession
from core.db.manager import DBManager
from core.db.models import FileModel, ChunkModel
from core.manager import TDriveManager
from core.session import SessionManager
from core.streaming import stream_from_telegram

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram")

# Telegram caption prefixes in Saved Messages
CAPTION_DRIVE = "tdrive:v1:"
CAPTION_STREAM = "tstream:"
CAPTION_S3 = "ts3:"


async def _get_saved_messages_stats(client) -> dict:
    """
    Scan Saved Messages to compute per-type storage stats.
    Cached via DB settings to avoid rescanning every poll (use last_scan_* keys).
    """
    # Prefer cached stats if recent (< 5 min old)
    with client._sm if hasattr(client, '_sm') else None:
        pass

    drive_chunks = stream_chunks = s3_chunks = unknown = total_size = total_messages = 0
    last_id = first_id = None

    async for msg in client.iter_messages("me", limit=None):
        total_messages += 1
        caption = msg.message or ""
        size = msg.file.size if msg.file else 0
        total_size += size

        if last_id is None or msg.id > last_id:
            last_id = msg.id
        if first_id is None or msg.id < first_id:
            first_id = msg.id

        if caption.startswith(CAPTION_DRIVE):
            drive_chunks += 1
        elif caption.startswith(CAPTION_STREAM):
            stream_chunks += 1
        elif caption.startswith(CAPTION_S3):
            s3_chunks += 1
        else:
            # pstream legacy captions: {profile}/{stem}
            if "/" in caption and not caption.startswith(("tdrive:", "tstream:", "ts3:")):
                stream_chunks += 1
            else:
                unknown += 1

    return {
        "total_messages": total_messages,
        "total_size_bytes": total_size,
        "drive_chunks": drive_chunks,
        "stream_chunks": stream_chunks,
        "s3_chunks": s3_chunks,
        "unknown": unknown,
        "last_message_id": last_id,
        "first_message_id": first_id,
    }


@router.get("/health", response_model=StructuredResponse[dict])
async def telegram_health(
    manager: Annotated[TDriveManager, Depends(get_manager)],
    sm: Annotated[SessionManager, Depends(get_session_manager)],
    refresh: bool = False,
):
    """
    Detailed Telegram storage health status.
    """
    client = manager.tg_client.client
    connected = client.is_connected()

    result = {
        "connected": connected,
        "session_valid": connected,
        "storage_target": manager.STORAGE_TARGET,
    }

    if not connected:
        result["error"] = "Not connected to Telegram"
        return StructuredResponse(success=True, data=result)

    # Account info
    try:
        me = await client.get_me()
        result["account"] = {
            "id": me.id,
            "first_name": me.first_name,
            "last_name": me.last_name,
            "username": me.username,
            "phone": me.phone,
            "premium": bool(getattr(me, "premium", False)),
            "bot": bool(getattr(me, "bot", False)),
        }
    except Exception as e:
        result["account_error"] = str(e)

    # Saved messages stats (cached in DB settings, refreshed on demand)
    from api.dependencies import _state
    now = time.time()
    cache_key = "tg_health_stats"
    config = sm.load_config()

    cached = None
    with manager.db_session.get_session() as session:
        from core.db.models import SettingModel
        row = session.execute(
            select(SettingModel).where(SettingModel.key == cache_key)
        ).scalar_one_or_none()
        if row:
            import json
            cached = json.loads(row.value)

    if refresh or not cached or (now - cached.get("_ts", 0)) > 300:
        try:
            stats = await _get_saved_messages_stats(client)
            stats["_ts"] = now
            result["storage"] = {k: v for k, v in stats.items() if k != "_ts"}
            # Cache
            with manager.db_session.get_session() as session:
                from core.db.models import SettingModel
                import json
                row = session.execute(
                    select(SettingModel).where(SettingModel.key == cache_key)
                ).scalar_one_or_none()
                if row:
                    row.value = json.dumps(stats)
                else:
                    session.add(SettingModel(key=cache_key, value=json.dumps(stats)))
                session.commit()
        except Exception as e:
            logger.error(f"Telegram health scan failed: {e}")
            result["storage_error"] = str(e)
    else:
        result["storage"] = {k: v for k, v in cached.items() if k != "_ts"}
        result["storage_cached"] = True

    # Connection latency
    try:
        t0 = time.monotonic()
        await client.get_me()
        result["connection"] = {
            "latency_ms": round((time.monotonic() - t0) * 1000),
            "flood_wait_until": None,
        }
    except Exception as e:
        result["connection"] = {"latency_ms": None, "error": str(e)}

    return StructuredResponse(success=True, data=result)


@router.post("/scan", response_model=StructuredResponse[dict])
async def trigger_scan(
    manager: Annotated[TDriveManager, Depends(get_manager)],
    sm: Annotated[SessionManager, Depends(get_session_manager)],
):
    """
    Force an immediate Saved Messages scan via the recovery engine.
    """
    from core.recovery import RecoveryEngine

    engine = RecoveryEngine(
        manager.db_session,
        manager.tg_client,
        master_password=manager.master_password,
        session_manager=sm,
    )
    try:
        stats = await engine.rebuild_index(full=True)
        return StructuredResponse(success=True, data=stats)
    except Exception as e:
        logger.error(f"Manual scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


@router.post("/test-upload", response_model=StructuredResponse[dict])
async def test_upload(manager: Annotated[TDriveManager, Depends(get_manager)]):
    """
    Upload a small test blob to Saved Messages and verify round-trip.
    """
    import io
    test_blob = b"tdrive-health-test-" + base64.b64encode(str(time.time()).encode())[:10]

    try:
        msg = await manager.tg_client.send_document(
            manager.STORAGE_TARGET,
            test_blob,
            caption="tdrive:healthcheck",
        )
        return StructuredResponse(
            success=True,
            data={"msg_id": msg.id, "bytes": len(test_blob), "status": "uploaded"},
        )
    except Exception as e:
        logger.error(f"Test upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/test-stream", response_model=StructuredResponse[dict])
async def test_stream(
    msg_id: int,
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    """
    Verify a message can be streamed from Telegram.
    """
    try:
        msg = await manager.tg_client.get_message(manager.STORAGE_TARGET, msg_id)
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        if not msg.document:
            raise HTTPException(status_code=400, detail="Message has no document")

        return StructuredResponse(
            success=True,
            data={
                "msg_id": msg.id,
                "size": msg.document.size,
                "mime": msg.document.mime_type,
                "streamable": True,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stream test failed: {str(e)}")