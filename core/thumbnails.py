"""
TDrive Thumbnail & Sprite Generation.

Generates poster thumbnails and sprite contact sheets for video streams.
Adapted from pstack deploy/telethon_storage.py:360-414.
"""

import json
import logging
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Defaults
POSTER_WIDTH = 640
SPRITE_WIDTH = 160
SPRITE_COLS = 10
SPRITE_INTERVAL = 10  # seconds between sprite frames


def make_poster(
    video_path: str | Path,
    output_path: str | Path,
    width: int = POSTER_WIDTH,
) -> Optional[Path]:
    """
    Extract a single poster frame from a video.

    Seeks to 25% of duration (or 30s, whichever is less) and extracts
    a single frame scaled to `width` pixels wide.

    Returns the output path on success, None on failure.
    """
    video_path = Path(video_path)
    output_path = Path(output_path)

    if output_path.exists():
        return output_path  # Idempotent

    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Get duration
        probe = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                str(video_path),
            ],
            capture_output=True, text=True, timeout=10,
        )
        duration = float(probe.stdout.strip() or "0")
        seek_pos = min(duration * 0.25, 30.0)

        # Extract frame
        subprocess.run(
            [
                "ffmpeg", "-y", "-ss", str(seek_pos),
                "-i", str(video_path),
                "-vframes", "1",
                "-vf", f"scale={width}:-1",
                "-q:v", "3",
                str(output_path),
            ],
            capture_output=True, timeout=30,
        )

        if output_path.exists():
            return output_path

    except Exception as e:
        logger.warning(f"Poster generation failed for {video_path.name}: {e}")

    return None


def make_sprite(
    video_path: str | Path,
    output_jpg: str | Path,
    output_meta: str | Path,
    width: int = SPRITE_WIDTH,
    cols: int = SPRITE_COLS,
    interval: int = SPRITE_INTERVAL,
) -> Optional[Path]:
    """
    Generate a sprite contact sheet for video hover previews.

    Creates a grid of thumbnail frames and a JSON metadata file with
    the info needed to render hover thumbnails via CSS backgroundPosition.

    Returns the sprite JPG path on success, None on failure.
    """
    video_path = Path(video_path)
    output_jpg = Path(output_jpg)
    output_meta = Path(output_meta)

    if output_jpg.exists():
        return output_jpg  # Idempotent

    output_jpg.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Get duration
        probe = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                str(video_path),
            ],
            capture_output=True, text=True, timeout=10,
        )
        duration = float(probe.stdout.strip() or "0")

        # Generate sprite
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(video_path),
                "-vf",
                f"fps=1/{interval},scale={width}:-1,tile={cols}x{cols}",
                "-q:v", "5",
                str(output_jpg),
            ],
            capture_output=True, timeout=120,
        )

        if not output_jpg.exists():
            return None

        # Calculate metadata
        frames_at_interval = int(duration / interval) + 1
        rows = (frames_at_interval + cols - 1) // cols

        meta = {
            "interval": interval,
            "cols": cols,
            "rows": rows,
            "count": frames_at_interval,
            "duration": round(duration, 2),
            "width": width,
        }

        output_meta.write_text(json.dumps(meta, indent=2))
        return output_jpg

    except Exception as e:
        logger.warning(f"Sprite generation failed for {video_path.name}: {e}")

    return None
