from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict

import pandas as pd


class ModelAdapterError(ValueError):
    pass


class BaseModelAdapter(ABC):
    def __init__(self, model_path: Path, metadata: Dict[str, Any] | None = None):
        self.model_path = model_path
        self.metadata = metadata or {}
        self.model: Any = None

    @abstractmethod
    def load(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def predict(self, input_frame: pd.DataFrame, config: Dict[str, Any]) -> Any:
        raise NotImplementedError


def call_model(model: Any, input_frame: pd.DataFrame, config: Dict[str, Any]) -> Any:
    # Fallback chain: custom protocol → sklearn-style predict(frame, config) → sklearn predict(frame) → callable
    if hasattr(model, "run_inference"):
        return model.run_inference(input_frame, config)
    if hasattr(model, "predict"):
        try:
            return model.predict(input_frame, config)
        except TypeError:
            return model.predict(input_frame)
    if callable(model):
        try:
            return model(input_frame, config)
        except TypeError:
            return model(input_frame)
    raise ModelAdapterError("Loaded model is not callable and has no predict/run_inference method")