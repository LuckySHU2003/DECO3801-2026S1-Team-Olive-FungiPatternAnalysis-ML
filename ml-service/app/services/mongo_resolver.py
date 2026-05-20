import logging
from typing import Any, Dict, Optional

from app.core import settings

logger = logging.getLogger("ml-service")

_client: Any = None


def _get_db():
    global _client
    # Lazy init avoids a connection attempt at import time when MONGODB_URI may not yet be set
    if _client is None:
        if not settings.mongodb_uri:
            raise ValueError("MONGODB_URI is not set — cannot resolve dataset_id/model_id from MongoDB")
        from motor.motor_asyncio import AsyncIOMotorClient
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client[settings.mongodb_database]


async def resolve_dataset(dataset_id: str) -> Dict[str, Any]:
    db = _get_db()
    collection = db[settings.datasets_collection]

    doc: Optional[Dict] = None
    try:
        from bson import ObjectId
        # Try ObjectId first; falls back to string lookup for records using a separate dataset_id field
        doc = await collection.find_one({"_id": ObjectId(dataset_id)})
    except Exception:
        pass

    if doc is None:
        doc = await collection.find_one({"dataset_id": dataset_id})

    if doc is None:
        raise ValueError(f"Dataset not found in MongoDB: {dataset_id!r}")

    logger.info("Resolved dataset %r → name=%r bucket=%r path=%r",
                dataset_id, doc.get("name"), doc.get("bucket"), doc.get("storage_path"))
    return doc


async def resolve_model(model_id: str) -> Dict[str, Any]:
    db = _get_db()
    collection = db[settings.models_collection]

    doc: Optional[Dict] = None
    try:
        from bson import ObjectId
        doc = await collection.find_one({"_id": ObjectId(model_id)})
    except Exception:
        pass

    if doc is None:
        doc = await collection.find_one({"model_id": model_id})

    if doc is None:
        raise ValueError(f"Model not found in MongoDB: {model_id!r}")

    logger.info("Resolved model %r → name=%r type=%r bucket=%r path=%r",
                model_id, doc.get("name"), doc.get("type"), doc.get("bucket"), doc.get("storage_path"))
    return doc