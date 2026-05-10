from pathlib import Path

from app.adapters.base import BaseModelAdapter, ModelAdapterError
from app.adapters.sklearn_adapter import SklearnModelAdapter
from app.adapters.torch_adapter import TorchModelAdapter


def select_adapter(model_type: str, model_path: Path, metadata: dict | None = None) -> BaseModelAdapter:
    normalized = model_type.lower().lstrip(".")
    suffix = model_path.suffix.lower().lstrip(".")
    effective = normalized if normalized != "other" else suffix

    if effective in {"pkl", "pickle", "joblib"}:
        return SklearnModelAdapter(model_path, metadata)
    if effective in {"pt", "pth"}:
        return TorchModelAdapter(model_path, metadata)
    raise ModelAdapterError(f"Unsupported model format: {model_type}. Supported: pkl, joblib, pt, pth.")
