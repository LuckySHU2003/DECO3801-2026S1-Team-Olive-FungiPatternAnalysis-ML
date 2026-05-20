from __future__ import annotations

from collections import Counter
from typing import Any, Dict, Iterable, List
from uuid import uuid4

import numpy as np
import pandas as pd

from app.dto.schemas import (
    CustomExplorationResponse,
    DetectPatternsResponse,
    Pattern,
    PatternPoint,
    PatternSummary,
    PredictFutureResponse,
    PredictedVoltagePoint,
    PredictionSummary,
)


class IncompatibleModelOutputError(ValueError):
    pass


def _to_python(value: Any) -> Any:
    # numpy scalars and arrays are not JSON-serialisable; convert to native Python types before returning
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    return value


def _raw_to_mapping(raw: Any) -> Dict[str, Any]:
    raw = _to_python(raw)
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list):
        return {"patterns": raw}
    raise IncompatibleModelOutputError("Model output must be a dict or list for pattern tasks")


def _point(value: dict) -> PatternPoint:
    return PatternPoint(time=float(value.get("time", value.get("Time", 0))), voltage=float(value.get("voltage", value.get("Voltage", 0))))


def normalize_patterns(raw: Any, frame: pd.DataFrame) -> List[Pattern]:
    payload = _raw_to_mapping(raw)
    raw_patterns = payload.get("patterns") or payload.get("detected_patterns") or []
    if not isinstance(raw_patterns, list):
        raise IncompatibleModelOutputError("Model output field 'patterns' must be a list")

    patterns: List[Pattern] = []
    for idx, item in enumerate(raw_patterns):
        if not isinstance(item, dict):
            raise IncompatibleModelOutputError("Each pattern must be an object")
        start_time = float(item.get("start_time", item.get("start", frame["Time"].iloc[0])))
        end_time = float(item.get("end_time", item.get("end", start_time)))
        segment = frame[(frame["Time"] >= start_time) & (frame["Time"] <= end_time)].head(50)
        snapshot_values = item.get("snapshot")
        if isinstance(snapshot_values, list):
            snapshot = [_point(p) for p in snapshot_values if isinstance(p, dict)]
        else:
            snapshot = [PatternPoint(time=float(r.Time), voltage=float(r.Voltage)) for r in segment.itertuples()]

        patterns.append(Pattern(
            pattern_id=str(item.get("pattern_id", f"pattern-{idx + 1}")),
            type=str(item.get("type", item.get("label", "unknown"))),
            start_time=start_time,
            end_time=end_time,
            snapshot=snapshot,
            frequency=float(item.get("frequency", 0.0)),
            amplitude=float(item.get("amplitude", 0.0)),
            interval=float(item.get("interval", 0.0)),
            confidence_score=float(item.get("confidence_score", item.get("confidence", payload.get("confidence_score", 0.0))))
        ))
    return patterns


def pattern_summary(patterns: List[Pattern]) -> PatternSummary:
    if not patterns:
        return PatternSummary(total_patterns=0, recurrence={}, average_frequency=0, average_amplitude=0, average_interval=0)
    return PatternSummary(
        total_patterns=len(patterns),
        recurrence=dict(Counter(p.type for p in patterns)),
        average_frequency=float(np.mean([p.frequency for p in patterns])),
        average_amplitude=float(np.mean([p.amplitude for p in patterns])),
        average_interval=float(np.mean([p.interval for p in patterns])),
    )


def average_confidence(patterns: List[Pattern], raw: Any) -> float:
    if patterns:
        return float(np.mean([p.confidence_score for p in patterns]))
    if isinstance(raw, dict) and "confidence_score" in raw:
        return float(raw["confidence_score"])
    return 0.0


def format_detect_patterns(raw: Any, frame: pd.DataFrame, preprocessing_mode: str) -> DetectPatternsResponse:
    patterns = normalize_patterns(raw, frame)
    return DetectPatternsResponse(
        confidence_score=average_confidence(patterns, raw if isinstance(raw, dict) else {}),
        preprocessing_used=preprocessing_mode,
        patterns=patterns,
        summary=pattern_summary(patterns),
    )


def format_custom_exploration(raw: Any, frame: pd.DataFrame, preprocessing: dict, config: dict, previous_run_id: str | None, previous_result: dict | None) -> CustomExplorationResponse:
    patterns = normalize_patterns(raw, frame)
    summary = pattern_summary(patterns)
    # comparison is only built when a previous run is referenced, enabling diff analysis across runs
    comparison = None
    if previous_run_id or previous_result:
        prev_patterns = previous_result.get("patterns", []) if previous_result else []
        prev_count = len(prev_patterns) if isinstance(prev_patterns, list) else 0
        prev_conf = 0.0
        if isinstance(prev_patterns, list) and prev_patterns:
            prev_conf = float(np.mean([float(p.get("confidence_score", 0.0)) for p in prev_patterns if isinstance(p, dict)]))
        comparison = {
            "previous_run_id": previous_run_id or previous_result.get("run_id", "previous"),
            "pattern_count_change": len(patterns) - prev_count,
            "average_confidence_change": average_confidence(patterns, raw if isinstance(raw, dict) else {}) - prev_conf,
        }

    return CustomExplorationResponse(
        confidence_score=average_confidence(patterns, raw if isinstance(raw, dict) else {}),
        run_id=str(uuid4()),
        config_used={
            "threshold": config.get("threshold"),
            "window_size": config.get("window_size"),
            "model_selection": config.get("model_selection"),
            "preprocessing_mode": preprocessing.get("mode"),
            "normalize": preprocessing.get("normalize"),
            "missing_value_strategy": preprocessing.get("missing_value_strategy"),
        },
        patterns=patterns,
        summary=summary,
        comparison=comparison,
    )


def _extract_predictions(raw: Any) -> tuple[list[float], list[float] | None]:
    # Handles multiple output key conventions used by different model implementations
    raw = _to_python(raw)
    if isinstance(raw, dict):
        if "predicted_voltage_window" in raw:
            points = raw["predicted_voltage_window"]
            preds = [float(p.get("predicted_voltage", p.get("voltage"))) for p in points]
            confs = [float(p.get("confidence_score", raw.get("confidence_score", 0.0))) for p in points]
            return preds, confs
        for key in ["predictions", "predicted_voltage", "y_pred", "forecast"]:
            if key in raw:
                preds = _to_python(raw[key])
                confs = _to_python(raw.get("confidence_scores")) if raw.get("confidence_scores") is not None else None
                return [float(x) for x in preds], [float(x) for x in confs] if confs is not None else None
    if isinstance(raw, list):
        return [float(x) for x in raw], None
    raise IncompatibleModelOutputError("Prediction model output must include predictions/predicted_voltage_window")


def format_predict_future(raw: Any, frame: pd.DataFrame, model_name: str, prediction_window: int) -> PredictFutureResponse:
    predictions, confidences = _extract_predictions(raw)
    predictions = predictions[:prediction_window]
    if len(predictions) == 0:
        raise IncompatibleModelOutputError("Prediction output is empty")
    if confidences is None:
        confidences = [float(raw.get("confidence_score", 0.0)) if isinstance(raw, dict) else 0.0] * len(predictions)
    confidences = confidences[:len(predictions)]

    last_time = float(frame["Time"].iloc[-1])
    # Median diff handles irregular sampling better than fixed step; fallback to 1.0 for single-row frames
    if len(frame) >= 2:
        step = float(frame["Time"].diff().dropna().median()) or 1.0
    else:
        step = 1.0

    points = [PredictedVoltagePoint(time=last_time + step * (i + 1), predicted_voltage=float(v), confidence_score=float(confidences[i])) for i, v in enumerate(predictions)]
    values = [p.predicted_voltage for p in points]
    avg_conf = float(np.mean([p.confidence_score for p in points]))
    return PredictFutureResponse(
        confidence_score=avg_conf,
        model_used=model_name,
        prediction_window=prediction_window,
        predicted_voltage_window=points,
        summary=PredictionSummary(
            start_time=points[0].time,
            end_time=points[-1].time,
            min_predicted_voltage=float(np.min(values)),
            max_predicted_voltage=float(np.max(values)),
            average_predicted_voltage=float(np.mean(values)),
            average_confidence_score=avg_conf,
        ),
    )
