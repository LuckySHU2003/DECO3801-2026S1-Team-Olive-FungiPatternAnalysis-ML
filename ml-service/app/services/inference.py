import logging

from app.dto.schemas import CustomExplorationRequest, DetectPatternsRequest, PredictFutureRequest
from app.services.dataset_loader import resolve_and_load_dataset
from app.services.model_loader import resolve_and_load_model_adapter
from app.services.preprocessing import filter_time_range, preprocess_time_voltage
from app.services.formatters import format_custom_exploration, format_detect_patterns, format_predict_future

logger = logging.getLogger("ml-service")


async def run_detect_patterns(request: DetectPatternsRequest):
    cfg = request.detection_config or request.config
    logger.info("detect_patterns job=%r dataset_id=%r model_id=%r",
                request.job_id, request.dataset.dataset_id, request.model.model_id)

    frame = preprocess_time_voltage(await resolve_and_load_dataset(request.dataset), request.preprocessing)
    adapter = await resolve_and_load_model_adapter(request.model)
    raw = adapter.predict(frame, cfg)
    return format_detect_patterns(raw, frame, request.preprocessing.mode)


async def run_custom_exploration(request: CustomExplorationRequest):
    cfg = request.analysis_config or request.config
    logger.info("custom_exploration job=%r dataset_id=%r model_id=%r",
                request.job_id, request.dataset.dataset_id, request.model.model_id)

    frame = preprocess_time_voltage(await resolve_and_load_dataset(request.dataset), request.preprocessing)
    frame = filter_time_range(frame, cfg)
    adapter = await resolve_and_load_model_adapter(request.model)
    raw = adapter.predict(frame, cfg)
    return format_custom_exploration(
        raw,
        frame,
        request.preprocessing.model_dump(),
        cfg,
        request.previous_run_id,
        request.previous_result,
    )


async def run_predict_future(request: PredictFutureRequest):
    cfg = request.prediction_config or request.config
    logger.info("predict_future job=%r dataset_id=%r model_id=%r",
                request.job_id, request.dataset.dataset_id, request.model.model_id)

    frame = preprocess_time_voltage(await resolve_and_load_dataset(request.dataset), request.preprocessing)
    adapter = await resolve_and_load_model_adapter(request.model)
    raw = adapter.predict(frame, cfg)
    model_name = request.model.name or request.model.model_id or "unknown"
    return format_predict_future(raw, frame, model_name, int(cfg.get("prediction_window", 1)))
