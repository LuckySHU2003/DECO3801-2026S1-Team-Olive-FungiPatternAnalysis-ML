from app.dto.schemas import CustomExplorationRequest, DetectPatternsRequest, PredictFutureRequest
from app.services.dataset_loader import load_dataset
from app.services.model_loader import load_model_adapter
from app.services.preprocessing import filter_time_range, preprocess_time_voltage
from app.services.formatters import format_custom_exploration, format_detect_patterns, format_predict_future


async def run_detect_patterns(request: DetectPatternsRequest):
    frame = preprocess_time_voltage(await load_dataset(request.dataset), request.preprocessing)
    adapter = await load_model_adapter(request.model)
    raw = adapter.predict(frame, request.config)
    return format_detect_patterns(raw, frame, request.preprocessing.mode)


async def run_custom_exploration(request: CustomExplorationRequest):
    frame = preprocess_time_voltage(await load_dataset(request.dataset), request.preprocessing)
    frame = filter_time_range(frame, request.config)
    adapter = await load_model_adapter(request.model)
    raw = adapter.predict(frame, request.config)
    return format_custom_exploration(
        raw,
        frame,
        request.preprocessing.model_dump(),
        request.config,
        request.previous_run_id,
        request.previous_result,
    )


async def run_predict_future(request: PredictFutureRequest):
    frame = preprocess_time_voltage(await load_dataset(request.dataset), request.preprocessing)
    adapter = await load_model_adapter(request.model)
    raw = adapter.predict(frame, request.config)
    return format_predict_future(raw, frame, request.model.name, int(request.config.get("prediction_window", 1)))
