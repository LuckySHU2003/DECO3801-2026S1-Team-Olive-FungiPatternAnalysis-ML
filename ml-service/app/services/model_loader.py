import logging
from typing import Optional

from app.adapters.registry import select_adapter
from app.dto.schemas import ModelRef
from app.services.file_cache import download_to_cache

logger = logging.getLogger("ml-service")


async def load_model_adapter(model: ModelRef):
    """Download and initialize a model adapter given a pre-resolved file_url."""
    if not model.file_url:
        raise ValueError("model.file_url is required when model_id is not provided")
    model_type = model.type or "pkl"
    local_path = await download_to_cache(str(model.file_url), suffix_hint=f".{model_type}")
    adapter = select_adapter(model_type, local_path, model.metadata)
    adapter.load()
    return adapter


async def resolve_and_load_model_adapter(model: ModelRef):
    """
    Resolve model by model_id (Option A) or fall back to file_url.
    When model_id is present: look up MongoDB, generate Supabase signed URL, download.
    """
    if model.model_id:
        from app.services.mongo_resolver import resolve_model
        from app.services.supabase_storage import generate_signed_url

        doc = await resolve_model(model.model_id)

        url: Optional[str] = None
        bucket = doc.get("bucket")
        storage_path = doc.get("storage_path")
        if bucket and storage_path:
            url = await generate_signed_url(bucket, storage_path)
            if url:
                logger.info("Using signed URL for model %r", model.model_id)

        if not url:
            url = doc.get("file_url")
            if url:
                logger.info("Falling back to file_url for model %r", model.model_id)

        if not url:
            raise ValueError(
                f"No download URL available for model {model.model_id!r}. "
                "Ensure bucket/storage_path or file_url is set in MongoDB."
            )

        model_type = doc.get("type") or model.type or "pkl"
        resolved = ModelRef(
            model_id=model.model_id,
            name=doc.get("name") or model.name or "unknown",
            type=model_type,
            version=doc.get("version") or model.version,
            file_url=url,
            storage_path=storage_path,
            metadata=doc.get("metadata") or model.metadata or {},
        )
        return await load_model_adapter(resolved)

    return await load_model_adapter(model)
