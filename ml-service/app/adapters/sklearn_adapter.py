import pickle
from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd

from app.adapters.base import BaseModelAdapter, call_model


class SklearnModelAdapter(BaseModelAdapter):
    def load(self) -> None:
        suffix = self.model_path.suffix.lower()
        if suffix == ".joblib":
            self.model = joblib.load(self.model_path)
        else:
            with self.model_path.open("rb") as f:
                self.model = pickle.load(f)

    def predict(self, input_frame: pd.DataFrame, config: Dict[str, Any]) -> Any:
        return call_model(self.model, input_frame, config)
