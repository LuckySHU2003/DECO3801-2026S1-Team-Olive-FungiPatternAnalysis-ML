"""Train a LSTM-style (MLP multi-output regression) model for voltage prediction.

Uses sklearn MLPRegressor over sliding input windows → fixed output windows.
Scaler is bundled; iterative prediction handles prediction_window > output_window.

Usage:
    python training/train_lstm_predict_future.py \
        --input "record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx"

Outputs:
    outputs/models/lstm_predict_future.pkl  -- runtime artifact for Supabase
    outputs/reports/lstm_metrics.json       -- local metrics only
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import cloudpickle
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import MinMaxScaler

sys.path.insert(0, str(Path(__file__).parent))
from common_preprocessing import (
    TRAIN_ADC_COLS,
    chronological_split,
    clean_adc_columns,
    get_channel_frames,
    load_training_file,
    make_sliding_windows,
    parse_training_time,
    preprocess_inference_frame,
)


# ---------------------------------------------------------------------------
# Bundled wrapper
# ---------------------------------------------------------------------------

class LSTMPredictWrapper:
    """MLP regressor wrapper satisfying the backend run_inference contract.

    Output format consumed by backend format_predict_future → _extract_predictions:
        {"predictions": [...], "confidence_scores": [...], "confidence_score": ...}
    """

    def __init__(
        self,
        model: MLPRegressor,
        scaler: MinMaxScaler,
        input_window: int,
        output_window: int,
        val_rmse_scaled: float,
    ) -> None:
        self.model = model
        self.scaler = scaler
        self.input_window = input_window
        self.output_window = output_window
        # Used to compute per-run confidence; scaled range is 2.0 ([-1, 1])
        self._base_conf = float(max(0.1, min(0.95, 1.0 - val_rmse_scaled / 2.0)))
        self.task_type = "predict_future"

    def run_inference(
        self,
        input_frame: pd.DataFrame,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        config = config or {}
        df = preprocess_inference_frame(input_frame)

        prediction_window = int(config.get("prediction_window", self.output_window))
        runtime_window = int(config.get("window_size", self.input_window))

        voltages = df["Voltage"].to_numpy(dtype=float)
        if len(voltages) < 2:
            return {"confidence_score": 0.0, "predictions": [], "confidence_scores": []}

        # Take the last runtime_window points and resample to model's input_window
        tail = voltages[-min(runtime_window, len(voltages)):]
        if len(tail) != self.input_window:
            x_old = np.linspace(0.0, 1.0, len(tail))
            x_new = np.linspace(0.0, 1.0, self.input_window)
            tail = np.interp(x_new, x_old, tail)

        tail_scaled = self.scaler.transform(tail.reshape(-1, 1)).ravel()

        # Predict — iterative if prediction_window > output_window
        if prediction_window <= self.output_window:
            y_scaled = self.model.predict(tail_scaled.reshape(1, -1))[0][:prediction_window]
        else:
            y_scaled_list: List[float] = []
            current = tail_scaled.copy()
            remaining = prediction_window
            while remaining > 0:
                chunk = self.model.predict(current.reshape(1, -1))[0]
                take = min(remaining, len(chunk))
                y_scaled_list.extend(chunk[:take].tolist())
                remaining -= take
                # Slide the input window forward
                current = np.concatenate([current[take:], chunk[:take]])
            y_scaled = np.array(y_scaled_list[:prediction_window])

        # Inverse-transform to original voltage scale
        preds = (
            self.scaler.inverse_transform(
                np.asarray(y_scaled).reshape(-1, 1)
            )
            .ravel()
            .tolist()
        )

        # Confidence decays slightly for farther predictions
        n = len(preds)
        decay = np.linspace(0.0, min(0.15, self._base_conf * 0.2), n)
        conf_scores = (self._base_conf - decay).clip(0.0, 1.0).tolist()
        avg_conf = float(np.mean(conf_scores))

        return {
            "confidence_score": round(avg_conf, 4),
            "predictions": [round(float(v), 6) for v in preds],
            "confidence_scores": [round(float(c), 4) for c in conf_scores],
        }


# ---------------------------------------------------------------------------
# Training helpers
# ---------------------------------------------------------------------------

def _build_sequences(
    channel_frames: List[pd.DataFrame],
    input_window: int,
    output_window: int,
) -> tuple:
    """Build (X, y) pairs where X = past window, y = next output_window values."""
    total = input_window + output_window
    X_parts: List[np.ndarray] = []
    y_parts: List[np.ndarray] = []
    step = max(1, input_window // 4)  # 75% overlap for more training samples
    for cf in channel_frames:
        voltages = cf["Voltage"].to_numpy(dtype=float)
        if len(voltages) < total:
            continue
        for i in range(0, len(voltages) - total + 1, step):
            X_parts.append(voltages[i : i + input_window])
            y_parts.append(voltages[i + input_window : i + total])
    if not X_parts:
        return np.empty((0, input_window)), np.empty((0, output_window))
    return np.array(X_parts, dtype=float), np.array(y_parts, dtype=float)


def _scale_channel_frames(
    channel_frames: List[pd.DataFrame], scaler: MinMaxScaler
) -> List[pd.DataFrame]:
    scaled = []
    for cf in channel_frames:
        cf2 = cf.copy()
        cf2["Voltage"] = (
            scaler.transform(cf["Voltage"].to_numpy(dtype=float).reshape(-1, 1))
            .ravel()
        )
        scaled.append(cf2)
    return scaled


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train LSTM-style future-voltage prediction model"
    )
    parser.add_argument("--input", required=True, help="Path to training .xlsx file")
    parser.add_argument("--output-dir", default="outputs")
    parser.add_argument("--window-size", type=int, default=64)
    parser.add_argument("--prediction-window", type=int, default=20)
    parser.add_argument(
        "--clip-outliers",
        type=lambda x: x.lower() not in ("false", "0", "no"),
        default=False,
        metavar="BOOL",
    )
    args = parser.parse_args()

    out = Path(args.output_dir)
    (out / "models").mkdir(parents=True, exist_ok=True)
    (out / "reports").mkdir(parents=True, exist_ok=True)

    print(f"[LSTM] Loading: {args.input}")
    df = load_training_file(args.input)
    df = parse_training_time(df)
    df = clean_adc_columns(df, clip_quantile=0.01 if args.clip_outliers else None)

    train_df, val_df, test_df = chronological_split(df)
    print(f"[LSTM] Split: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")

    input_window = args.window_size
    output_window = args.prediction_window

    # Fit scaler on all training-channel voltages together
    all_train_v = np.concatenate(
        [train_df[c].to_numpy(dtype=float) for c in TRAIN_ADC_COLS]
    )
    scaler = MinMaxScaler(feature_range=(-1.0, 1.0))
    scaler.fit(all_train_v.reshape(-1, 1))

    train_channels_s = _scale_channel_frames(get_channel_frames(train_df), scaler)
    val_channels_s = _scale_channel_frames(get_channel_frames(val_df), scaler)
    test_channels_s = _scale_channel_frames(get_channel_frames(test_df), scaler)

    X_train, y_train = _build_sequences(train_channels_s, input_window, output_window)
    X_val, y_val = _build_sequences(val_channels_s, input_window, output_window)
    X_test, y_test = _build_sequences(test_channels_s, input_window, output_window)

    print(
        f"[LSTM] Sequences: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}"
    )

    if len(X_train) == 0:
        raise RuntimeError(
            "No training sequences generated. "
            "Try a smaller --window-size or --prediction-window."
        )

    mlp = MLPRegressor(
        hidden_layer_sizes=(256, 128, 64),
        max_iter=300,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=15,
    )
    print("[LSTM] Training MLP regressor...")
    mlp.fit(X_train, y_train)
    print(f"[LSTM] Converged in {mlp.n_iter_} iterations")

    def _metrics(X, y):
        if len(X) == 0:
            return 0.0, 0.0
        preds = mlp.predict(X)
        mae = float(np.mean(np.abs(preds - y)))
        rmse = float(np.sqrt(np.mean((preds - y) ** 2)))
        return mae, rmse

    val_mae, val_rmse = _metrics(X_val, y_val)
    test_mae, test_rmse = _metrics(X_test, y_test)
    print(f"[LSTM] Val  MAE={val_mae:.6f}  RMSE={val_rmse:.6f}")
    print(f"[LSTM] Test MAE={test_mae:.6f}  RMSE={test_rmse:.6f}")

    wrapper = LSTMPredictWrapper(
        model=mlp,
        scaler=scaler,
        input_window=input_window,
        output_window=output_window,
        val_rmse_scaled=val_rmse,
    )

    model_path = out / "models" / "lstm_predict_future.pkl"
    with open(model_path, "wb") as f:
        cloudpickle.dump(wrapper, f)
    print(f"[LSTM] Saved: {model_path}")

    metrics = {
        "val_mae_scaled": val_mae,
        "val_rmse_scaled": val_rmse,
        "test_mae_scaled": test_mae,
        "test_rmse_scaled": test_rmse,
        "train_sequences": int(len(X_train)),
        "val_sequences": int(len(X_val)),
        "test_sequences": int(len(X_test)),
        "input_window": input_window,
        "output_window": output_window,
        "mlp_iterations": int(mlp.n_iter_),
        "note": "MAE/RMSE are in MinMaxScaler([-1,1]) space, not raw voltage.",
    }
    report_path = out / "reports" / "lstm_metrics.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[LSTM] Metrics: {report_path}")


if __name__ == "__main__":
    main()
