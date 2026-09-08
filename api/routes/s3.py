"""
TDrive S3-Compatible Gateway.

Exposes Tdrive's Telegram storage as a minimal S3 API. Objects are stored
in the FileModel table under virtual_path="/s3/{bucket}" with filename="{key}".

Implemented S3 operations (single-user subset):
  PUT /{bucket}/{key}     -> upload object
  GET /{bucket}/{key}     -> download object (streaming)
  HEAD /{bucket}/{key}    -> object metadata
  DELETE /{bucket}/{key}  -> delete object
  GET /{bucket}?prefix=    -> list objects in bucket
  DELETE /{bucket}        -> delete bucket (only if empty)
  GET /                   -> list all buckets
  GET /health             -> health check
"""

import logging
import mimetypes
import re
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_, func

from api.dependencies import get_manager
from api.schemas import StructuredResponse
from core.db.manager import DBManager
from core.db.models import FileModel
from core.manager import TDriveManager
from core.session import SessionManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/s3", tags=["s3"])

# Validate bucket/key names loosely (S3 allows letters, digits, .-_; no ".." or slashes in key beyond separators)
_BUCKET_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{1,62}[a-zA-Z0-9]$")
_KEY_RE = re.compile(r"^[a-zA-Z0-9/._~\-]{1,1024}$")


def _validate_key(key: str):
    if not _KEY_RE.match(key) or ".." in key:
        raise HTTPException(status_code=400, detail="Invalid object key")
    return key


def _validate_bucket(bucket: str):
    if not _BUCKET_RE.match(bucket):
        raise HTTPException(status_code=400, detail="Invalid bucket name")
    return bucket


def _file_key(fb: FileModel) -> str:
    """Return the object key for a FileModel in the S3 namespace."""
    return fb.filename


# ── Object operations ─────────────────────────────────────────────────────

@router.put("/{bucket}/{key:path}")
async def put_object(
    bucket: str,
    key: str,
    request: Request,
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    """
    Upload an object. Body is read fully, encrypted, and stored on Telegram.
    Uses a temp file to reuse the existing upload_file() path.
    """
    _validate_bucket(bucket)
    _validate_key(key)
    filename = key.split("/")[-1] or "object"
    virtual_path = f"/s3/{bucket}"

    body = await request.body()
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty body")

    import tempfile
    from pathlib import Path

    with tempfile.NamedTemporaryFile(delete=False, suffix="_s3") as tmp:
        tmp.write(body)
        tmp_path = tmp.name

    try:
        file_id = await manager.upload_file(
            Path(tmp_path),
            virtual_path=virtual_path,
            storage_provider="telegram",
        )
    except Exception as e:
        logger.error(f"S3 PUT failed for {bucket}/{key}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    # Update filename to the object key (upload_file used tmp filename)
    with manager.db_session.get_session() as session:
        db = DBManager(session)
        rec = db.get_file(file_id)
        if rec:
            rec.filename = key
            rec.storage_provider = "s3"
            session.add(rec)
            session.commit()

    return Response(
        status_code=200,
        headers={"ETag": f'"{rec.sha256[:16]}"' if rec else '"unknown"'},
    )


@router.get("/{bucket}/{key:path}")
async def get_object(
    bucket: str,
    key: str,
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    """Download an object, streamed. Supports Range requests via the store."""
    _validate_bucket(bucket)
    _validate_key(key)
    virtual_path = f"/s3/{bucket}"

    with manager.db_session.get_session() as session:
        db = DBManager(session)
        rec = db.get_file_by_path_and_name(virtual_path, key)
        if not rec:
            raise HTTPException(status_code=404, detail="No such key")

        size = rec.size
        etag = rec.sha256[:16]
        mime = mimetypes.guess_type(key)[0] or "application/octet-stream"

    async def stream():
        async for chunk in manager.download_file_stream(rec.file_id):
            yield chunk

    return StreamingResponse(
        stream(),
        media_type=mime,
        headers={
            "Content-Length": str(size),
            "ETag": f'"{etag}"',
            "Accept-Ranges": "bytes",
        },
    )


@router.head("/{bucket}/{key:path}")
async def head_object(
    bucket: str,
    key: str,
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    _validate_bucket(bucket)
    _validate_key(key)
    virtual_path = f"/s3/{bucket}"

    with manager.db_session.get_session() as session:
        db = DBManager(session)
        rec = db.get_file_by_path_and_name(virtual_path, key)
        if not rec:
            raise HTTPException(status_code=404, detail="No such key")

    return Response(
        status_code=200,
        headers={
            "Content-Length": str(rec.size),
            "ETag": f'"{rec.sha256[:16]}"',
            "Last-Modified": rec.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT") if rec.created_at else "",
        },
    )


@router.delete("/{bucket}/{key:path}")
async def delete_object(
    bucket: str,
    key: str,
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    _validate_bucket(bucket)
    _validate_key(key)
    virtual_path = f"/s3/{bucket}"

    with manager.db_session.get_session() as session:
        db = DBManager(session)
        rec = db.get_file_by_path_and_name(virtual_path, key)
        if not rec:
            raise HTTPException(status_code=404, detail="No such key")
        file_id = rec.file_id

    await manager.trash_file(file_id)
    return Response(status_code=204)


# ── Literal routes FIRST (before parameterized /{bucket}) ─────────────────

@router.get("/health")
async def s3_health(
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    """Health check for the S3 gateway."""
    return {
        "status": "ok",
        "backend": "telegram",
        "connected": manager.tg_client.client.is_connected(),
        "storage_target": manager.STORAGE_TARGET,
    }


@router.get("")
async def list_buckets(
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    """List all S3 buckets (derived from virtual_path prefixes)."""
    with manager.db_session.get_session() as session:
        rows = session.execute(
            select(FileModel.virtual_path, func.count(FileModel.file_id), func.sum(FileModel.size))
            .where(FileModel.virtual_path.like("/s3/%"))
            .group_by(FileModel.virtual_path)
        ).all()

    buckets = []
    for vpath, count, total in rows:
        bucket_name = vpath.split("/", 3)[-1] if vpath.count("/") >= 2 else vpath
        buckets.append(
            {
                "Name": bucket_name,
                "ObjectCount": count,
                "TotalSize": int(total or 0),
            }
        )
    return {"Buckets": buckets}


# ── Bucket operations ─────────────────────────────────────────────────────

@router.get("/{bucket}")
async def list_objects(
    bucket: str,
    manager: Annotated[TDriveManager, Depends(get_manager)],
    prefix: str = "",
    max_keys: int = 1000,
):
    """List objects in a bucket, optionally filtered by prefix."""
    _validate_bucket(bucket)
    virtual_path = f"/s3/{bucket}"

    with manager.db_session.get_session() as session:
        db = DBManager(session)
        q = select(FileModel).where(
            FileModel.virtual_path == virtual_path,
            FileModel.is_trashed == False,
        )
        if prefix:
            q = q.where(FileModel.filename.like(f"{prefix}%"))
        q = q.order_by(FileModel.filename).limit(max_keys)
        rows = session.execute(q).scalars().all()

    objects = [
        {
            "Key": r.filename,
            "Size": r.size,
            "ETag": f'"{r.sha256[:16]}"',
            "LastModified": r.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if r.created_at else "",
        }
        for r in rows
    ]
    return {"Contents": objects, "IsTruncated": False}


@router.delete("/{bucket}")
async def delete_bucket(
    bucket: str,
    manager: Annotated[TDriveManager, Depends(get_manager)],
):
    _validate_bucket(bucket)
    virtual_path = f"/s3/{bucket}"

    with manager.db_session.get_session() as session:
        db = DBManager(session)
        count = session.execute(
            select(func.count(FileModel.file_id)).where(FileModel.virtual_path == virtual_path)
        ).scalar()
        if count and count > 0:
            raise HTTPException(status_code=409, detail="Bucket not empty")

    return Response(status_code=204)
