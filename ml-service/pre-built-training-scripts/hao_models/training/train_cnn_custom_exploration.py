"""Train a CNN-style (MLP) pattern-recognition classifier and export a bundled .pkl.

Uses sklearn MLPClassifier over raw voltage windows (treats each window as a
fixed-length feature vector — analogous to a 1-D CNN over the signal).

Usage:
    python training/train_cnn_custom_exploration.py \
        --input "record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx"

Outputs:
    outputs/models/cnn_custom_exploration.pkl  -- runtime artifact for Supabase
    outputs/reports/cnn_metrics.json          -- local metrics only
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
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).parent))
from common_preprocessing import (
    TRAIN_ADC_COLS,
    chronological_split,
    clean_adc_columns,
    get_channel_frames,
    heuristic_label,
    load_training_file,
    make_sliding_windows,
    parse_training_time,
    preprocess_inference_frame,
    resize_to,
)


# ---------------------------------------------------------------------------
# Bundled wrapper
# ---------------------------------------------------------------------------

class CNNPatternWrapper:
    """MLP (CNN-style) classifier wrapper satisfying the backend run_inference contract.

    At inference, runtime windows are resampled to trained_window_size before
    being passed to the model, so window_size=20 in config is handled safely.
    """

    def __init__(
        self,
        model: MLPClassifier,
        scaler: StandardScaler,
        label_encoder: LabelEncoder,
        trained_window_size: int,
        default_threshold: float,
    ) -> None:
        self.model = model
        self.scaler = scaler
        self.label_encoder = label_encoder
        self.trained_window_size = trained_window_size
        self.default_threshold = default_threshold
        self.task_type = "custom_exploration"

    def run_inference(
        self,
        input_frame: pd.DataFrame,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        config = config or {}
        df = preprocess_inference_frame(input_frame)

        runtime_window = int(config.get("window_size", self.trained_window_size))
        threshold = float(config.get("threshold", self.default_threshold))

        voltages = df["Voltage"].to_numpy(dtype=float)
        times = df["Time"].to_numpy(dtype=float)

        if len(voltages) < 4:
            return {"confidence_score": 0.0, "patterns": []}

        runtime_window = min(runtime_window, len(voltages))
        step = max(1, runtime_window // 2)

        windows, starts = make_sliding_windows(voltages, runtime_window, step)
        if len(windows) == 0:
            return {"confidence_score": 0.0, "patterns": []}

        # Resample each window to the size the model was trained on
        resized = np.array(
            [resize_to(w, self.trained_window_size) for w in windows]
        )
        X_scaled = self.scaler.transform(resized)

        labels_enc = self.model.predict(X_scaled)
        labels = self.label_encoder.inverse_transform(labels_enc)
        proba = self.model.predict_proba(X_scaled)

        patterns: List[Dict[str, Any]] = []
        for idx, (label, start_idx, prob_row, w) in enumerate(
            zip(labels, starts, proba, windows)
        ):
            conf = float(np.max(prob_row))
            if conf < threshold:
                continue
            end_idx = min(int(start_idx) + runtime_window - 1, len(times) - 1)
            t_start = float(times[int(start_idx)])
            t_end = float(times[end_idx])
            duration = max(t_end - t_start, 1e-6)
            amp = float(np.max(np.abs(w - np.mean(w))))
            freq = round(1.0 / duration, 6)
            patterns.append(
                {
                    "pattern_id": f"pattern-{idx + 1}",
                    "type": str(label),
                    "start_time": round(t_start, 4),
                    "end_time": round(t_end, 4),
                    "frequency": freq,
                    "amplitude": round(amp, 6),
                    "interval": round(duration, 4),
                    "confidence_score": round(conf, 4),
                }
            )

        avg_conf = (
            float(np.mean([p["confidence_score"] for p in patterns]))
            if patterns
            else 0.0
        )
        return {"confidence_score": round(avg_conf, 4), "patterns": patterns}


# ---------------------------------------------------------------------------
# Training helpers
# ---------------------------------------------------------------------------

def _build_windows_and_labels(
    channel_frames: List[pd.DataFrame],
    window_size: int,
    step: int,
    global_mean: float,
    global_std: float,
) -> tuple:
    windows_list: List[np.ndarray] = []
    labels_list: List[str] = []
    for cf in channel_frames:
        voltages = cf["Voltage"].to_numpy(dtype=float)
        wins, _ = make_sliding_windows(voltages, window_size, step)
        if len(wins) == 0:
            continue
        labels = [heuristic_label(w, global_mean, global_std) for w in wins]
        windows_list.append(wins)
        labels_list.extend(labels)
    if not windows_list:
        return np.empty((0, window_size), dtype=float), []
    return np.vstack(windows_list), labels_list


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train CNN-style pattern recognition model"
    )
    parser.add_argument("--input", required=True, help="Path to training .xlsx file")
    parser.add_argument("--output-dir", default="outputs")
    parser.add_argument("--window-size", type=int, default=64)
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

    print(f"[CNN] Loading: {args.input}")
    df = load_training_file(args.input)
    df = parse_training_time(df)
    df = clean_adc_columns(df, clip_quantile=0.01 if args.clip_outliers else None)

    train_df, val_df, test_df = chronological_split(df)
    print(f"[CNN] Split: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")

    all_train_v = np.concatenate(
        [train_df[c].to_numpy(dtype=float) for c in TRAIN_ADC_COLS]
    )
    global_mean = float(np.mean(all_train_v))
    global_std = float(np.std(all_train_v))

    window_size = args.window_size
    step = max(1, window_size // 2)

    X_train, y_train = _build_windows_and_labels(
        get_channel_frames(train_df), window_size, step, global_mean, global_std
    )
    X_val, y_val = _build_windows_and_labels(
        get_channel_frames(val_df), window_size, step, global_mean, global_std
    )
    X_test, y_test = _build_windows_and_labels(
        get_channel_frames(test_df), window_size, step, global_mean, global_std
    )

    print(f"[CNN] Windows: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    classes, counts = np.unique(y_train, return_counts=True)
    print(f"[CNN] Labels (train): {dict(zip(classes, counts.tolist()))}")

    le = LabelEncoder()
    y_train_enc = le.fit_transform(y_train)
    y_val_enc = le.transform(y_val)
    y_test_enc = le.transform(y_test)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)

    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        max_iter=200,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=10,
    )
    print("[CNN] Training MLP classifier...")
    mlp.fit(X_train_s, y_train_enc)
    print(f"[CNN] Converged in {mlp.n_iter_} iterations")

    val_acc = float(np.mean(mlp.predict(X_val_s) == y_val_enc))
    test_acc = float(np.mean(mlp.predict(X_test_s) == y_test_enc))
    print(f"[CNN] Val={val_acc:.4f}  Test={test_acc:.4f}")

    wrapper = CNNPatternWrapper(mlp, scaler, le, window_size, 0.5)

    model_path = out / "models" / "cnn_custom_exploration.pkl"
    with open(model_path, "wb") as f:
        cloudpickle.dump(wrapper, f)
    print(f"[CNN] Saved: {model_path}")

    metrics = {
        "val_accuracy": val_acc,
        "test_accuracy": test_acc,
        "train_windows": int(len(X_train)),
        "val_windows": int(len(X_val)),
        "test_windows": int(len(X_test)),
        "window_size": window_size,
        "mlp_iterations": int(mlp.n_iter_),
        "classes": le.classes_.tolist(),
        "label_distribution_train": {
            k: int(v) for k, v in zip(classes, counts.tolist())
        },
    }
    report_path = out / "reports" / "cnn_metrics.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[CNN] Metrics: {report_path}")


if __name__ == "__main__":
    main()
