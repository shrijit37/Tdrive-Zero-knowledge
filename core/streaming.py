"""
TDrive Streaming Engine.

HTTP Range streaming from Telegram Saved Messages.
Adapted from pstack's h_stream handler for FastAPI.
"""

import re
import asyncio
import logging
import time
from typing import AsyncGenerator, Optional

from fastapi import Request, Response
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

# Streaming constants
STREAM_MAX_RANGE_BYTES = 16 * 1024 * 1024  # 16 MiB max per Range response
MTProto_ALIGN = 4096  # 4096-byte alignment for MTProto offset optimization
MTProto_BLOCK = MTProto_ALIGN * 64  # 256KB per iter_download block


def _parse_range(header: str, total: int) -> tuple[int, int]:
    """Parse HTTP Range header into (start, end) inclusive."""
    start, end = 0, total - 1
    rng = header.strip()

    m = re.match(r"bytes=(\d+)-(\d*)$", rng)
    if m:
        start = int(m.group(1))
        if m.group(2):
            end = int(m.group(2))
    elif re.match(r"bytes=-(\d+)$", rng):
        suffix = int(re.match(r"bytes=-(\d+)$", rng).group(1))
        start = max(0, total - suffix)

    end = min(end, total - 1)
    return start, end


async def stream_from_telegram(
    client,
    msg,
    request: Request,
    max_range_bytes: int = STREAM_MAX_RANGE_BYTES,
) -> Response:
    """
    Stream a Telegram document via HTTP Range requests.

    Adapted from pstack deploy/telethon_storage.py:428-535.

    Args:
        client: Connected Telethon TelegramClient
        msg: Telethon Message object with a document
        request: FastAPI Request (for Range header)
        max_range_bytes: Max bytes per Range response (default 16 MiB)

    Returns:
        StreamingResponse with appropriate Range headers
    """
    if not msg or not msg.document:
        return Response(status_code=404, content="Message not found or has no document")

    total = msg.document.size
    filename = next(
        (a.file_name for a in msg.document.attributes if getattr(a, "file_name", None)),
        "file",
    )
    mime = msg.document.mime_type or "application/octet-stream"

    # Parse Range header
    rng = request.headers.get("Range", "")
    start, end = 0, total - 1

    if rng:
        start, end = _parse_range(rng, total)

    # Cap the range to prevent massive MTProto transfers
    requested_end = end
    if end - start + 1 > max_range_bytes:
        end = min(start + max_range_bytes - 1, total - 1)

    # Validate range
    if start > end or start >= total:
        return Response(
            status_code=416,
            headers={"Content-Range": f"bytes */{total}"},
        )

    # 4096-byte alignment for MTProto offset optimization
    aligned = (start // MTProto_ALIGN) * MTProto_ALIGN
    discard = start - aligned
    want = end - start + 1

    # Build response headers
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": mime,
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Length": str(want),
    }

    status = 200
    if rng:
        status = 206
        headers["Content-Range"] = f"bytes {start}-{end}/{total}"

    # Streaming generator
    async def range_generator() -> AsyncGenerator[bytes, None]:
        offset = aligned
        sent = 0
        retries = 0
        t0 = time.monotonic()

        try:
            while sent < want:
                try:
                    async for chunk in client.iter_download(
                        msg.media, offset=offset, request_size=MTProto_BLOCK
                    ):
                        raw = bytes(chunk)
                        offset += len(raw)
                        data = raw

                        # Discard bytes before the requested start
                        if discard:
                            if len(data) <= discard:
                                discard -= len(data)
                                continue
                            data = data[discard:]
                            discard = 0

                        # Don't overshoot
                        if sent >= want:
                            break
                        if len(data) > want - sent:
                            data = data[: want - sent]

                        yield data
                        sent += len(data)

                    if sent >= want:
                        break

                except (ConnectionResetError, asyncio.CancelledError):
                    logger.debug(
                        f"Client disconnected: sent={sent}/{want} bytes"
                    )
                    return
                except (TimeoutError, ConnectionError, OSError) as e:
                    retries += 1
                    logger.warning(
                        f"Stream error (retry {retries}/3): {e} | sent={sent}/{want}"
                    )
                    if retries > 3:
                        logger.error(f"Stream aborted after 3 retries")
                        return
                    await asyncio.sleep(1)

        except (ConnectionResetError, asyncio.CancelledError):
            pass

        elapsed = time.monotonic() - t0
        speed = sent / max(elapsed, 0.01) / (1024 * 1024)
        if sent >= want:
            logger.info(
                f"Stream complete: {sent / 1024 / 1024:.1f}MB in {elapsed:.1f}s ({speed:.1f}MB/s)"
            )

    return StreamingResponse(
        range_generator(),
        status_code=status,
        headers=headers,
        media_type=mime,
    )
