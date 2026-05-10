import argparse
import cloudpickle
import numpy as np
import pandas as pd
from pathlib import Path
from uuid import uuid4

# This script trains and exports dummy ML models for the base jobs of the models.
# All analysis here is simple mockup based on the sameple dataset. It's not correct!

# This script run indenpendantly from the whole project. 
# Only use as internal tool for ml payload and deployment testing.
# These dummy models are meant for testing the end-to-end system and should be replaced with real models in production.
# Usage:
#   python train_dummy_models.py --dataset path/to/sample_dataset.csv --out exported_models


def load_time_voltage(path: str) -> pd.DataFrame:
    if path.endswith(".csv"):
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path)

    time_col = "Time" if "Time" in df.columns else df.columns[0]

    if "Voltage" in df.columns:
        voltage_col = "Voltage"
    else:
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        voltage_col = next(c for c in numeric_cols if c != time_col)

    out = df[[time_col, voltage_col]].copy()
    out.columns = ["Time", "Voltage"]
    out = out.dropna()
    return out


class DummyDetectModel:
    def predict(self, input_frame, config=None):
        config = config or {}
        df = input_frame.copy()
        threshold = float(config.get("threshold", 1.5))

        v = df["Voltage"].astype(float)
        z = (v - v.mean()) / (v.std() + 1e-8)
        idxs = np.where(np.abs(z) > threshold)[0][:20]

        patterns = []
        for i, idx in enumerate(idxs):
            patterns.append({
                "pattern_id": f"pat_{i+1}",
                "type": "spike",
                "start_time": str(df.iloc[idx]["Time"]),
                "end_time": str(df.iloc[idx]["Time"]),
                "snapshot": {
                    "time": str(df.iloc[idx]["Time"]),
                    "voltage": float(df.iloc[idx]["Voltage"])
                },
                "frequency": 1.0,
                "amplitude": float(abs(z.iloc[idx])),
                "interval": 0.0,
                "confidence_score": 0.75
            })

        return {
            "detected_patterns": patterns,
            "patterns": patterns,
            "summary": {
                "recurrence": {"spike": len(patterns)},
                "averages": {
                    "frequency": 1.0 if patterns else 0.0,
                    "amplitude": float(np.mean([p["amplitude"] for p in patterns])) if patterns else 0.0,
                    "confidence_score": 0.75 if patterns else 0.0
                }
            }
        }


class DummyCustomModel(DummyDetectModel):
    def predict(self, input_frame, config=None):
        config = config or {}
        df = input_frame.copy()

        time_range = config.get("time_range")
        if time_range:
            start = time_range.get("start")
            end = time_range.get("end")
            if start is not None:
                df = df[df["Time"] >= start]
            if end is not None:
                df = df[df["Time"] <= end]

        base = super().predict(df, config)
        return {
            "run_id": f"run_{uuid4().hex[:8]}",
            "config_used": config,
            "patterns": base["patterns"],
            "summary": base["summary"],
            "comparison": None
        }


class DummyPredictModel:
    def predict(self, input_frame, config=None):
        config = config or {}
        df = input_frame.copy()
        window = int(config.get("prediction_window", 20))

        v = df["Voltage"].astype(float).tail(10)
        last_time = float(pd.to_numeric(df["Time"], errors="coerce").dropna().iloc[-1])
        step = 1.0

        if len(df) >= 2:
            times = pd.to_numeric(df["Time"], errors="coerce").dropna()
            if len(times) >= 2:
                step = float(times.diff().dropna().median())

        avg = float(v.mean())
        predicted = []

        for i in range(window):
            predicted.append({
                "time": last_time + step * (i + 1),
                "voltage": avg,
                "confidence_score": 0.70
            })

        voltages = [p["voltage"] for p in predicted]

        return {
            "predicted_voltage_window": predicted,
            "model_used": "dummy_predict",
            "confidence_score": 0.70,
            "summary": {
                "start_time": predicted[0]["time"],
                "end_time": predicted[-1]["time"],
                "min_predicted_voltage": min(voltages),
                "max_predicted_voltage": max(voltages),
                "average_predicted_voltage": float(np.mean(voltages)),
                "average_confidence_score": 0.70
            }
        }


def save_model(model, path: Path):
    with open(path, "wb") as f:
        cloudpickle.dump(model, f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--out", default="exported_models")
    args = parser.parse_args()

    df = load_time_voltage(args.dataset)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    save_model(DummyDetectModel(), out / "dummy_detect.pkl")
    save_model(DummyCustomModel(), out / "dummy_custom.pkl")
    save_model(DummyPredictModel(), out / "dummy_predict.pkl")

    print("Exported:")
    print(out / "dummy_detect.pkl")
    print(out / "dummy_custom.pkl")
    print(out / "dummy_predict.pkl")
    print(f"Training data loaded: {len(df)} rows")


if __name__ == "__main__":
    main()