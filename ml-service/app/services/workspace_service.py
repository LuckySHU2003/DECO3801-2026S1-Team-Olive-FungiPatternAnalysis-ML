from statistics import mean
from uuid import uuid4


def _pattern():
    return {
        "pattern_id": str(uuid4()),
        "type": "mock_pattern",
        "start_time": 0.0,
        "end_time": 10.0,
        "snapshot": [{"time": 0.0, "voltage": 1.0}, {"time": 1.0, "voltage": 1.2}],
        "frequency": 0.5,
        "amplitude": 1.2,
        "interval": 2.0,
        "confidence_score": 0.88,
    }


def _summary(patterns):
    return {
        "total_patterns": len(patterns),
        "recurrence": {"mock_pattern": len(patterns)},
        "average_frequency": mean([p["frequency"] for p in patterns]),
        "average_amplitude": mean([p["amplitude"] for p in patterns]),
        "average_interval": mean([p["interval"] for p in patterns]),
    }


def mock_detect_patterns(payload: dict):
    patterns = [_pattern()]
    return {
        "job": "detect_patterns",
        "status": "completed",
        "confidence_score": 0.88,
        "preprocessing_used": payload.get("preprocessing", {}).get("mode", "raw"),
        "patterns": patterns,
        "summary": _summary(patterns),
    }


def mock_custom_exploration(payload: dict):
    patterns = [_pattern()]
    config = payload.get("config", {})
    preprocessing = payload.get("preprocessing", {})
    previous_run_id = payload.get("previous_run_id")
    response = {
        "job": "custom_exploration",
        "status": "completed",
        "confidence_score": 0.9,
        "run_id": str(uuid4()),
        "config_used": {
            "threshold": config.get("threshold", 0.0),
            "window_size": config.get("window_size", 0),
            "model_selection": config.get("model_selection", "rf"),
            "preprocessing_mode": preprocessing.get("mode", "raw"),
            "normalize": preprocessing.get("normalize", False),
            "missing_value_strategy": preprocessing.get("missing_value_strategy", "interpolate"),
        },
        "patterns": patterns,
        "summary": _summary(patterns),
    }
    if previous_run_id:
        response["comparison"] = {
            "previous_run_id": previous_run_id,
            "pattern_count_change": 0,
            "average_confidence_change": 0.0,
        }
    return response


def mock_predict_future(payload: dict):
    config = payload.get("config", {})
    window = int(config.get("prediction_window", 5))
    points = [
        {"time": float(i), "predicted_voltage": 1.0 + i * 0.01, "confidence_score": 0.85}
        for i in range(1, window + 1)
    ]
    voltages = [p["predicted_voltage"] for p in points]
    confidences = [p["confidence_score"] for p in points]
    return {
        "job": "predict_future",
        "status": "completed",
        "confidence_score": mean(confidences),
        "model_used": payload.get("model", {}).get("name", "mock_model"),
        "prediction_window": window,
        "predicted_voltage_window": points,
        "summary": {
            "start_time": points[0]["time"],
            "end_time": points[-1]["time"],
            "min_predicted_voltage": min(voltages),
            "max_predicted_voltage": max(voltages),
            "average_predicted_voltage": mean(voltages),
            "average_confidence_score": mean(confidences),
        },
    }
