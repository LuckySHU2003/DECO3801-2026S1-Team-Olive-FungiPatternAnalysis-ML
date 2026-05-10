import pandas as pd

from app.services.formatters import format_detect_patterns, format_predict_future


def frame():
    return pd.DataFrame({"Time": [0, 1, 2], "Voltage": [1.0, 2.0, 1.5]})


def test_detect_patterns_shape():
    raw = {"patterns": [{"type": "spike", "start_time": 0, "end_time": 1, "confidence_score": 0.9, "frequency": 1, "amplitude": 1, "interval": 1}]}
    result = format_detect_patterns(raw, frame(), "raw")
    assert result.job == "detect_patterns"
    assert result.summary.total_patterns == 1


def test_predict_future_shape():
    raw = {"predictions": [1.1, 1.2], "confidence_scores": [0.8, 0.7]}
    result = format_predict_future(raw, frame(), "model-a", 2)
    assert result.job == "predict_future"
    assert len(result.predicted_voltage_window) == 2
