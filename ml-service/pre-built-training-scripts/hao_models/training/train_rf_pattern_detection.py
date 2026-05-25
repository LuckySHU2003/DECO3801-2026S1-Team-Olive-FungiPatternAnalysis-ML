"""Train a Random Forest pattern-detection classifier and export a bundled .pkl.

Usage:
    python training/train_rf_pattern_detection.py \
        --input "record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx"

Outputs:
    outputs/models/rf_pattern_detection.pkl   -- runtime artifact for Supabase
    outputs/reports/rf_metrics.json           -- local metrics only
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
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    _HAS_PLOT = True
except ImportError:
    _HAS_PLOT = False

sys.path.insert(0, str(Path(__file__).parent))
from common_preprocessing import (
    TRAIN_ADC_COLS,
    chronological_split,
    clean_adc_columns,
    extract_rf_features,
    get_channel_frames,
    heuristic_label,
    load_training_file,
    make_sliding_windows,
    parse_training_time,
    plot_data_split,
    plot_raw_signal,
    preprocess_inference_frame,
)


# ---------------------------------------------------------------------------
# Bundled wrapper
# ---------------------------------------------------------------------------

class RFPatternWrapper:
    """RandomForest classifier wrapper satisfying the backend run_inference contract.

    The backend calls model.run_inference(input_frame, config) via call_model()
    in app/adapters/base.py.
    """

    def __init__(
        self,
        model: RandomForestClassifier,
        scaler: StandardScaler,
        label_encoder: LabelEncoder,
        default_window_size: int,
        default_threshold: float,
    ) -> None:
        self.model = model
        self.scaler = scaler
        self.label_encoder = label_encoder
        self.default_window_size = default_window_size
        self.default_threshold = default_threshold
        self.task_type = "detect_patterns"

    def run_inference(
        self,
        input_frame: pd.DataFrame,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        config = config or {}
        df = preprocess_inference_frame(input_frame)

        window_size = int(config.get("window_size", self.default_window_size))
        threshold = float(config.get("threshold", self.default_threshold))

        voltages = df["Voltage"].to_numpy(dtype=float)
        times = df["Time"].to_numpy(dtype=float)

        if len(voltages) < 4:
            return {"confidence_score": 0.0, "patterns": []}

        window_size = min(window_size, len(voltages))
        step = max(1, window_size // 2)

        windows, starts = make_sliding_windows(voltages, window_size, step)
        if len(windows) == 0:
            return {"confidence_score": 0.0, "patterns": []}

        X = np.array([extract_rf_features(w) for w in windows])
        X_scaled = self.scaler.transform(X)

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
            end_idx = min(int(start_idx) + window_size - 1, len(times) - 1)
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
# Plot helpers
# ---------------------------------------------------------------------------

_RF_FEATURE_NAMES = ["mean", "std", "min", "max", "range", "slope", "median", "mad", "peaks", "energy"]
_PATTERN_COLORS   = {"normal": "#2ca02c", "spike": "#d62728", "drop": "#1f77b4", "unstable": "#ff7f0e"}


def _save_rf_plots(
    clf: RandomForestClassifier,
    le: LabelEncoder,
    X_test_s: np.ndarray,
    y_test_enc: np.ndarray,
    cv_scores: np.ndarray,
    classes: np.ndarray,
    counts: np.ndarray,
    plots_dir: Path,
) -> None:
    if not _HAS_PLOT:
        return
    plots_dir.mkdir(parents=True, exist_ok=True)
    class_names = le.classes_.tolist()

    # Label distribution
    fig, ax = plt.subplots(figsize=(6, 4))
    bar_colors = [_PATTERN_COLORS.get(c, "steelblue") for c in classes]
    bars = ax.bar(classes, counts, color=bar_colors, edgecolor="white")
    ax.set_title("Training Label Distribution (RF)", fontweight="bold")
    ax.set_ylabel("Window count")
    ax.set_xlabel("Pattern type")
    for bar, n in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(counts) * 0.01,
                str(n), ha="center", va="bottom", fontsize=10)
    plt.tight_layout()
    fig.savefig(plots_dir / "rf_03_label_distribution.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {plots_dir / 'rf_03_label_distribution.png'}")

    # Cross-validation scores per fold
    fig, ax = plt.subplots(figsize=(6, 3.5))
    fold_labels = [f"Fold {i + 1}" for i in range(len(cv_scores))]
    fold_colors = ["#1f77b4", "#ff7f0e", "#2ca02c"][: len(cv_scores)]
    bars = ax.bar(fold_labels, cv_scores, color=fold_colors, edgecolor="white")
    ax.axhline(cv_scores.mean(), color="crimson", linestyle="--", linewidth=1.5,
               label=f"Mean = {cv_scores.mean():.3f}")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Accuracy")
    ax.set_title("TimeSeriesCV Accuracy per Fold", fontweight="bold")
    ax.legend()
    for bar, score in zip(bars, cv_scores):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                f"{score:.3f}", ha="center", va="bottom", fontsize=10)
    plt.tight_layout()
    fig.savefig(plots_dir / "rf_04_cv_scores.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {plots_dir / 'rf_04_cv_scores.png'}")

    # Feature importances
    importances = clf.feature_importances_
    idx = np.argsort(importances)[::-1]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar([_RF_FEATURE_NAMES[i] for i in idx], importances[idx],
           color="steelblue", edgecolor="white")
    ax.set_title("RF Feature Importances (Mean Decrease Impurity)", fontweight="bold")
    ax.set_ylabel("Importance")
    ax.set_xlabel("Feature")
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    fig.savefig(plots_dir / "rf_05_feature_importance.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {plots_dir / 'rf_05_feature_importance.png'}")

    # Confusion matrix on test set
    y_pred = clf.predict(X_test_s)
    cm = confusion_matrix(y_test_enc, y_pred)
    fig, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(im, ax=ax)
    ticks = np.arange(len(class_names))
    ax.set_xticks(ticks); ax.set_yticks(ticks)
    ax.set_xticklabels(class_names, rotation=30, ha="right")
    ax.set_yticklabels(class_names)
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black", fontsize=11)
    ax.set_ylabel("True label"); ax.set_xlabel("Predicted label")
    ax.set_title("RF Confusion Matrix (Test Set)", fontweight="bold")
    plt.tight_layout()
    fig.savefig(plots_dir / "rf_06_confusion_matrix.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {plots_dir / 'rf_06_confusion_matrix.png'}")


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
    X_parts: List[np.ndarray] = []
    y_parts: List[str] = []
    for cf in channel_frames:
        voltages = cf["Voltage"].to_numpy(dtype=float)
        windows, _ = make_sliding_windows(voltages, window_size, step)
        if len(windows) == 0:
            continue
        feats = np.array([extract_rf_features(w) for w in windows])
        labels = [heuristic_label(w, global_mean, global_std) for w in windows]
        X_parts.append(feats)
        y_parts.extend(labels)
    if not X_parts:
        return np.empty((0, 10), dtype=float), []
    return np.vstack(X_parts), y_parts


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Train RF pattern detection model")
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
    plots_dir = out / "plots"

    print(f"[RF] Loading: {args.input}")
    df = load_training_file(args.input)
    df = parse_training_time(df)
    df = clean_adc_columns(df, clip_quantile=0.01 if args.clip_outliers else None)

    plot_raw_signal(df, str(plots_dir / "rf_01_raw_signal.png"), title="Raw ADC Channels — RF Training")

    train_df, val_df, test_df = chronological_split(df)
    print(f"[RF] Split: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")
    plot_data_split(train_df, val_df, test_df, str(plots_dir / "rf_02_data_split.png"))

    # Global stats from ALL training-channel voltages (for pseudo-labelling)
    all_train_v = np.concatenate(
        [train_df[c].to_numpy(dtype=float) for c in TRAIN_ADC_COLS]
    )
    global_mean = float(np.mean(all_train_v))
    global_std = float(np.std(all_train_v))
    print(f"[RF] Global stats: mean={global_mean:.4f}, std={global_std:.4f}")

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

    print(f"[RF] Windows: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    classes, counts = np.unique(y_train, return_counts=True)
    print(f"[RF] Labels (train): {dict(zip(classes, counts.tolist()))}")

    le = LabelEncoder()
    y_train_enc = le.fit_transform(y_train)
    y_val_enc = le.transform(y_val)
    y_test_enc = le.transform(y_test)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)

    clf = RandomForestClassifier(
        n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
    )
    tscv = TimeSeriesSplit(n_splits=3)
    cv_scores = cross_val_score(
        clf, X_train_s, y_train_enc, cv=tscv, scoring="accuracy"
    )
    print(f"[RF] CV accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    clf.fit(X_train_s, y_train_enc)

    val_acc = float(np.mean(clf.predict(X_val_s) == y_val_enc))
    test_acc = float(np.mean(clf.predict(X_test_s) == y_test_enc))
    print(f"[RF] Val={val_acc:.4f}  Test={test_acc:.4f}")

    _save_rf_plots(clf, le, X_test_s, y_test_enc, cv_scores, classes, counts, plots_dir)

    wrapper = RFPatternWrapper(clf, scaler, le, window_size, 0.5)

    model_path = out / "models" / "rf_pattern_detection.pkl"
    with open(model_path, "wb") as f:
        cloudpickle.dump(wrapper, f)
    print(f"[RF] Saved: {model_path}")

    metrics = {
        "cv_accuracy_mean": float(cv_scores.mean()),
        "cv_accuracy_std": float(cv_scores.std()),
        "val_accuracy": val_acc,
        "test_accuracy": test_acc,
        "train_windows": int(len(X_train)),
        "val_windows": int(len(X_val)),
        "test_windows": int(len(X_test)),
        "window_size": window_size,
        "classes": le.classes_.tolist(),
        "label_distribution_train": {
            k: int(v) for k, v in zip(classes, counts.tolist())
        },
    }
    report_path = out / "reports" / "rf_metrics.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[RF] Metrics: {report_path}")


if __name__ == "__main__":
    main()
