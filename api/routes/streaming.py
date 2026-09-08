"""
TDrive Streaming Routes.

HTTP Range streaming from Telegram Saved Messages for video playback.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy import select, func

from api.dependencies import get_manager, get_session_manager, get_db_session, validate_csrf
from api.schemas import StructuredResponse
from core.db.session import DatabaseSession
from core.db.manager import DBManager
from core.db.models import FileModel, ChunkModel
from core.manager import TDriveManager
from core.streaming import stream_from_telegram
from core.session import SessionManager

router = APIRouter(prefix="/stream", tags=["streaming"])


@router.get("/{msg_id}")
async def stream_file(
    msg_id: int,
    request: Request,
    manager: Annotated[TDriveManager, Depends(get_manager)],
    sm: Annotated[SessionManager, Depends(get_session_manager)],
):
    """
    Stream a Telegram document via HTTP Range requests.

    Fetches the message from Saved Messages and serves it with full
    Range/seek support using 4096-byte aligned MTProto offsets.
    """
    try:
        msg = await manager.tg_client.get_message(manager.STORAGE_TARGET, msg_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch message: {str(e)}")

    if not msg or not msg.document:
        raise HTTPException(status_code=404, detail="Message not found or has no document")

    return await stream_from_telegram(
        client=manager.tg_client.client,
        msg=msg,
        request=request,
    )
