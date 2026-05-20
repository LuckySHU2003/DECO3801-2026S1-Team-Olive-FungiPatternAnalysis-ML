from typing import Any, Dict

import numpy as np
import pandas as pd

from app.adapters.base import BaseModelAdapter, ModelAdapterError, call_model


class TorchModelAdapter(BaseModelAdapter):
    def load(self) -> None:
        try:
            import torch
        except ImportError as exc:
            raise ModelAdapterError("Torch model selected but torch is not installed. Install torch in the ML service environment.") from exc
        # map_location="cpu" allows GPU-trained models to run on CPU-only inference servers
        self.model = torch.load(self.model_path, map_location="cpu")

    def predict(self, input_frame: pd.DataFrame, config: Dict[str, Any]) -> Any:
        try:
            import torch
        except ImportError as exc:
            raise ModelAdapterError("Torch model selected but torch is not installed.") from exc

        # eval() disables dropout and batch-norm for deterministic inference
        if hasattr(self.model, "eval") and callable(getattr(self.model, "eval")):
            self.model.eval()
            values = input_frame[["Time", "Voltage"]].to_numpy(dtype=np.float32)
            tensor = torch.tensor(values, dtype=torch.float32)
            with torch.no_grad():
                output = self.model(tensor)
            if hasattr(output, "detach"):
                return output.detach().cpu().numpy()
            return output

        return call_model(self.model, input_frame, config)
