import pandas as pd
from scipy.signal import detrend

from model_loader import load_model, run_inference


def load_dataset(path: str):
    if path.endswith(".xlsx"):
        return pd.read_excel(path)
    if path.endswith(".csv"):
        return pd.read_csv(path)

    raise ValueError("Only .xlsx and .csv are supported")


def preprocess(df, time_col, voltage_col, mode):
    data = df.copy()

    if mode == "detrended":
        data[voltage_col] = detrend(data[voltage_col].values)

    return data


def prepare_data(payload):
    df = load_dataset(payload["dataset"]["path"])
    columns = payload["dataset"]["columns"]

    mode = payload.get("preprocessing", {}).get("mode", "raw")

    if "time" in columns and "voltage" in columns:
        df = preprocess(df, columns["time"], columns["voltage"], mode)

    return df


def require_confidence(model_output):
    if "confidence_score" not in model_output:
        raise KeyError("Model output must include confidence_score")

    return model_output["confidence_score"]


def job_2_pattern_detection(payload):
    data = prepare_data(payload)
    model = load_model(payload["model"]["path"], payload["model"]["type"])

    model_output = run_inference(
        model,
        data,
        payload.get("detection_config", {})
    )

    return {
        "job": "pattern_detection",
        "status": "success",
        "confidence_score": require_confidence(model_output),
        "preprocessing_used": payload["preprocessing"]["mode"],
        "patterns": model_output["patterns"],
        "summary": model_output["summary"]
    }


def job_3_custom_exploration(payload):
    data = prepare_data(payload)
    model = load_model(payload["model"]["path"], payload["model"]["type"])

    model_output = run_inference(
        model,
        data,
        payload.get("analysis_config", {})
    )

    return {
        "job": "custom_pattern_exploration",
        "status": "success",
        "confidence_score": require_confidence(model_output),
        "run_id": model_output.get("run_id"),
        "config_used": payload["analysis_config"],
        "patterns": model_output["patterns"],
        "summary": model_output["summary"]
    }

# =============HOLD TILL HAVE CORRELATION DATASET===========
def job_4_correlation(payload):
    data = prepare_data(payload)
    model = load_model(payload["model"]["path"], payload["model"]["type"])

    model_output = run_inference(
        model,
        data,
        payload.get("correlation_config", {})
    )

    return {
        "job": "correlation_analysis",
        "status": "success",
        "confidence_score": require_confidence(model_output),
        "environment_correlation": model_output["environment_correlation"],
        "species_comparison": model_output.get("species_comparison")
    }


def job_5_future_prediction(payload):
    data = prepare_data(payload)
    model = load_model(payload["model"]["path"], payload["model"]["type"])

    model_output = run_inference(
        model,
        data,
        payload.get("prediction_config", {})
    )

    return {
        "job": "future_prediction",
        "status": "success",
        "confidence_score": require_confidence(model_output),
        "model_used": payload["model"]["name"],
        "prediction_window": payload["prediction_config"]["prediction_window"],
        "predicted_voltage_window": model_output["predicted_voltage_window"],
        "summary": model_output["summary"]
    }