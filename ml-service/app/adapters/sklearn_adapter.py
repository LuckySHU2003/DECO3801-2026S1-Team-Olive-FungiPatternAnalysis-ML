import logging
import pickle
from typing import Any, Dict

import joblib
import pandas as pd

from app.adapters.base import BaseModelAdapter, ModelAdapterError, call_model

logger = logging.getLogger("ml-service")


class SklearnModelAdapter(BaseModelAdapter):
    def load(self) -> None:
        suffix = self.model_path.suffix.lower()

        # .joblib files: try joblib first
        if suffix == ".joblib":
            try:
                self.model = joblib.load(self.model_path)
                logger.info("Loaded model with joblib: %s", self.model_path.name)
                return
            except Exception as exc:
                logger.warning("joblib.load failed for %s: %s — trying pickle chain", self.model_path.name, exc)

        # cloudpickle — handles models saved with cloudpickle.
        # Patch _class_setstate if the installed cloudpickle is older than the one
        # used to save the model (introduced in cloudpickle 2.1.0).
        try:
            import cloudpickle
            import cloudpickle.cloudpickle as _cp
            if not hasattr(_cp, "_class_setstate"):
                def _class_setstate(obj, state):
                    obj_state, slotstate = state
                    if obj_state is not None:
                        obj.__dict__.update(obj_state)
                    if slotstate is not None:
                        for k, v in slotstate.items():
                            setattr(obj, k, v)
                    return obj
                _cp._class_setstate = _class_setstate
                logger.debug("Patched missing cloudpickle._class_setstate")

            if not hasattr(_cp, "_function_setstate"):
                def _function_setstate(obj, state):
                    obj_state, slotstate = state
                    obj.__dict__.update(obj_state)
                    if slotstate is not None:
                        for k, v in slotstate.items():
                            setattr(obj, k, v)
                    return obj
                _cp._function_setstate = _function_setstate
                logger.debug("Patched missing cloudpickle._function_setstate")
            with self.model_path.open("rb") as f:
                self.model = cloudpickle.load(f)
            logger.info("Loaded model with cloudpickle: %s", self.model_path.name)
            return
        except ImportError:
            pass
        except Exception as exc:
            logger.warning("cloudpickle.load failed for %s: %s — trying standard pickle", self.model_path.name, exc)

        # standard pickle
        try:
            with self.model_path.open("rb") as f:
                self.model = pickle.load(f)
            logger.info("Loaded model with pickle: %s", self.model_path.name)
            return
        except Exception as exc:
            logger.warning("pickle.load failed for %s: %s — trying joblib as final fallback", self.model_path.name, exc)

        # joblib fallback with mmap_mode=None — avoids readonly errors on memmap arrays
        try:
            self.model = joblib.load(self.model_path, mmap_mode=None)
            logger.info("Loaded model with joblib (mmap_mode=None): %s", self.model_path.name)
            return
        except Exception as exc:
            logger.warning("joblib(mmap_mode=None) failed for %s: %s — trying dill", self.model_path.name, exc)

        # dill — handles complex closures and C-extension types that pickle/cloudpickle cannot
        try:
            import dill
            with self.model_path.open("rb") as f:
                self.model = dill.load(f)
            logger.info("Loaded model with dill: %s", self.model_path.name)
            return
        except ImportError:
            logger.warning("dill not installed — skipping (pip install dill to enable)")
        except Exception as exc:
            logger.warning("dill.load failed for %s: %s", self.model_path.name, exc)

        raise ModelAdapterError(
            f"All loaders failed for {self.model_path.name}. "
            "Tried: joblib, cloudpickle, pickle, joblib(mmap_mode=None), dill. "
            "The model may have been saved in an incompatible environment. "
            "Re-save it with: import cloudpickle; cloudpickle.dump(model, open('model.pkl','wb'))"
        )

    def predict(self, input_frame: pd.DataFrame, config: Dict[str, Any]) -> Any:
        return call_model(self.model, input_frame, config)
