import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.adapters.base import ModelAdapterError
from app.api.routes.custom_exploration import router as custom_exploration_router
from app.api.routes.detect_patterns import router as detect_patterns_router
from app.api.routes.predict_future import router as predict_future_router
from app.core import settings
from app.services.dataset_loader import DatasetValidationError
from app.services.file_cache import RemoteFileError
from app.services.formatters import IncompatibleModelOutputError

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("ml-service")

app = FastAPI(title="ML Service", version="2.0.0")


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.exception("Request failed: %s", exc)
    status = 422 if isinstance(exc, (DatasetValidationError, ModelAdapterError, RemoteFileError, IncompatibleModelOutputError)) else 400
    return JSONResponse(status_code=status, content={"error": exc.__class__.__name__, "message": str(exc)})


@app.get("/health")
async def health():
    return {"ok": True, "service": "ml-service", "env": settings.app_env}


app.include_router(detect_patterns_router)
app.include_router(custom_exploration_router)
app.include_router(predict_future_router)
