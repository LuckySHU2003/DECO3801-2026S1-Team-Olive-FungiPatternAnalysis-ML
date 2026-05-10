import hashlib
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.core import settings


class RemoteFileError(ValueError):
    pass


async def download_to_cache(url: str, suffix_hint: str = "") -> Path:
    if not url:
        raise RemoteFileError("file_url is required")

    cache_dir = Path(settings.tmp_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)

    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix or suffix_hint
    name = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24] + suffix
    target = cache_dir / name
    if target.exists() and target.stat().st_size > 0:
        return target

    fd, tmp_name = tempfile.mkstemp(prefix="download-", suffix=suffix, dir=cache_dir)
    os.close(fd)
    tmp_path = Path(tmp_name)

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            tmp_path.write_bytes(response.content)
        tmp_path.replace(target)
        return target
    except Exception as exc:
        tmp_path.unlink(missing_ok=True)
        raise RemoteFileError(f"Failed to download remote file: {exc}") from exc
