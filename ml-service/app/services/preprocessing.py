import numpy as np
import pandas as pd

from app.dto.schemas import PreprocessingConfig


def preprocess_time_voltage(frame: pd.DataFrame, config: PreprocessingConfig) -> pd.DataFrame:
    data = frame.copy()
    if config.missing_value_strategy == "drop":
        data = data.dropna(subset=["Time", "Voltage"])
    elif config.missing_value_strategy == "interpolate":
        data = data.sort_values("Time")
        data["Voltage"] = data["Voltage"].interpolate(method="linear", limit_direction="both")
        data["Time"] = data["Time"].interpolate(method="linear", limit_direction="both")
    elif config.missing_value_strategy == "forward_fill":
        data = data.ffill().bfill()
    elif config.missing_value_strategy == "zero_fill":
        data = data.fillna(0)

    data = data.dropna(subset=["Time", "Voltage"]).sort_values("Time").reset_index(drop=True)
    if data.empty:
        raise ValueError("Dataset has no usable Time/Voltage rows after preprocessing")

    if config.mode == "detrended":
        x = np.arange(len(data), dtype=float)
        if len(data) >= 2:
            coeffs = np.polyfit(x, data["Voltage"].to_numpy(dtype=float), deg=1)
            trend = np.polyval(coeffs, x)
            data["Voltage"] = data["Voltage"].to_numpy(dtype=float) - trend

    if config.normalize:
        std = float(data["Voltage"].std(ddof=0))
        mean = float(data["Voltage"].mean())
        data["Voltage"] = 0.0 if std == 0 else (data["Voltage"] - mean) / std

    return data


def filter_time_range(frame: pd.DataFrame, config: dict) -> pd.DataFrame:
    time_range = config.get("time_range")
    if not time_range:
        return frame
    start = time_range.get("start")
    end = time_range.get("end")
    if start is None or end is None:
        return frame
    return frame[(frame["Time"] >= float(start)) & (frame["Time"] <= float(end))].reset_index(drop=True)
