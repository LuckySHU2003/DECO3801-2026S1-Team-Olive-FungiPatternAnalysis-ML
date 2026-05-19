import logging
from typing import Optional

import httpx

from app.core import settings

logger = logging.getLogger("ml-service")


async def generate_signed_url(bucket: str, storage_path: str, expires_in: int = 3600) -> Optional[str]:
    """Request a signed download URL from Supabase Storage using the service role key."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — cannot generate signed URL")
        return None

    # storage_path in MongoDB sometimes includes the bucket name as a prefix (e.g. "datasets/file.csv"
    # when bucket is already "datasets"). Strip it to avoid doubling: /datasets/datasets/file.csv
    clean_path = storage_path
    if clean_path.startswith(f"{bucket}/"):
        clean_path = clean_path[len(bucket) + 1:]

    api_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/sign/{bucket}/{clean_path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(api_url, json={"expiresIn": expires_in}, headers=headers)
            response.raise_for_status()
            data = response.json()

        # Supabase returns signedURL (relative) or signedUrl depending on version
        relative = data.get("signedURL") or data.get("signedUrl") or data.get("signed_url")
        if not relative:
            logger.warning("Supabase signed URL response missing signedURL field: %s", data)
            return None

        if relative.startswith("http"):
            return relative

        base = settings.supabase_url.rstrip("/")

        if relative.startswith("/storage/v1/"):
            return f"{base}{relative}"

        if relative.startswith("/object/"):
            return f"{base}/storage/v1{relative}"

        return f"{base}/storage/v1/{relative.lstrip('/')}"

    except Exception as exc:
        logger.warning("Failed to generate signed URL for %s/%s: %s", bucket, storage_path, exc)
        return None
 