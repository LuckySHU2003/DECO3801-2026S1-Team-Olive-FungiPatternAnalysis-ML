"""Smoke-test the three exported model artifacts against a backend-style input.

Manually runnable — not a pytest suite.

Usage:
    python training/smoke_test_models.py --sample-input sample_time_voltage.xlsx

    # If the sample file is a CSV, pass the csv path:
    python training/smoke_test_models.py --sample-input sample_time_voltage.csv

Outputs (backend-compatible, no efficiency metrics inside):
    outputs/smoke_tests/rf_smoke_output.json
    outputs/smoke_tests/cnn_smoke_output.json
    outputs/smoke_tests/lstm_smoke_output.json

Efficiency metrics are printed to stdout only.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict

import cloudpickle
import numpy as np
import pandas as pd

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    _HAS_PLOT = True
except ImportError:
    _HAS_PLOT = False

sys.path.insert(0, str(Path(__file__).parent))
from common_preprocessing import preprocess_inference_frame


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_artifact(path: Path):
    t0 = time.perf_counter()
    with open(path, "rb") as f:
        obj = cloudpickle.load(f)
    return obj, time.perf_counter() - t0


def load_sample_input(path: str) -> pd.DataFrame:
    """Load backend-style Time+Voltage file; handles .xlsx, .xls, and .csv."""
    p = Path(path)
    if p.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(path, sheet_name=0)
    else:
        df = pd.read_csv(path)
    if "Time" not in df.columns or "Voltage" not in df.columns:
        raise ValueError(
            f"Sample input must have 'Time' and 'Voltage' columns. "
            f"Got: {df.columns.tolist()}"
        )
    return df[["Time", "Voltage"]].copy()


def to_serializable(obj: Any) -> Any:
    """Recursively convert numpy types to JSON-native Python types."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_serializable(v) for v in obj]
    return obj


def _resolve_sample_path(path: str) -> str:
    """Try the given path; fall back to .csv if the .xlsx variant is missing."""
    if Path(path).exists():
        return path
    alt = Path(path).with_suffix(".csv")
    if alt.exists():
        print(f"[INFO] '{path}' not found — using '{alt}' instead.")
        return str(alt)
    raise FileNotFoundError(
        f"Sample input not found: '{path}'. "
        "Pass --sample-input with the correct filename."
    )


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

def run_one(
    label: str,
    model_path: Path,
    frame: pd.DataFrame,
    config: Dict[str, Any],
    output_path: Path,
) -> tuple:
    """Run inference for one model. Returns (result_dict, inference_ms) or (None, 0.0)."""
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  {label}")
    print(sep)

    if not model_path.exists():
        print(f"  SKIP — model not found: {model_path}")
        return None, 0.0

    artifact, load_time_s = load_artifact(model_path)
    print(f"  Load time:       {load_time_s * 1000:.1f} ms")
    print(f"  Input rows:      {len(frame)}")
    print(f"  Config:          {config}")

    t0 = time.perf_counter()
    result = artifact.run_inference(frame, config)
    inf_time_s = time.perf_counter() - t0
    print(f"  Inference time:  {inf_time_s * 1000:.1f} ms")

    # Efficiency metrics (stdout only — NOT included in backend output)
    n_patterns = len(result.get("patterns", []))
    n_preds = len(result.get("predictions", []))
    if n_patterns:
        print(f"  Windows / patterns found: {n_patterns}")
    if n_preds:
        print(f"  Predictions returned:     {n_preds}")
    print(f"  Top-level confidence:    {result.get('confidence_score', 'n/a')}")

    # Save backend-compatible output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as fh:
        json.dump(to_serializable(result), fh, indent=2)
    print(f"  Saved:           {output_path}")

    return result, inf_time_s * 1000


# ---------------------------------------------------------------------------
# Smoke-test visualisation
# ---------------------------------------------------------------------------

_PATTERN_COLORS = {"normal": "#2ca02c", "spike": "#d62728", "drop": "#1f77b4", "unstable": "#ff7f0e"}


def _save_smoke_plots(
    frame: pd.DataFrame,
    rf_result: Dict[str, Any],
    rf_ms: float,
    cnn_result: Dict[str, Any],
    cnn_ms: float,
    lstm_result: Dict[str, Any],
    lstm_ms: float,
    out_dir: Path,
) -> None:
    if not _HAS_PLOT:
        return
    out_dir.mkdir(parents=True, exist_ok=True)

    times = frame["Time"].to_numpy(dtype=float)
    voltages = frame["Voltage"].to_numpy(dtype=float)

    # 1 — Input signal
    fig, ax = plt.subplots(figsize=(12, 3.5))
    ax.plot(times, voltages, color="steelblue", linewidth=0.9, alpha=0.9)
    ax.set_xlabel("Time (s)"); ax.set_ylabel("Voltage")
    ax.set_title("Smoke Test — Input Signal (Time + Voltage)", fontweight="bold")
    ax.grid(True, alpha=0.25)
    plt.tight_layout()
    fig.savefig(out_dir / "smoke_01_input_signal.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {out_dir / 'smoke_01_input_signal.png'}")

    # 2 & 3 — Pattern overlays for RF and CNN
    for tag, result, filename in [
        ("RF Pattern Detection",   rf_result,  "smoke_02_rf_patterns.png"),
        ("CNN Custom Exploration", cnn_result, "smoke_03_cnn_patterns.png"),
    ]:
        if result is None:
            continue
        patterns = result.get("patterns", [])
        fig, ax = plt.subplots(figsize=(12, 3.5))
        ax.plot(times, voltages, color="#aaaaaa", linewidth=0.7, zorder=1, label="Signal")
        seen: set = set()
        for p in patterns:
            ptype = p.get("type", "normal")
            color = _PATTERN_COLORS.get(ptype, "purple")
            lbl = ptype if ptype not in seen else "_nolegend_"
            seen.add(ptype)
            ax.axvspan(p["start_time"], p["end_time"], alpha=0.35, color=color, label=lbl, zorder=2)
        if seen:
            ax.legend(loc="upper right", fontsize=9)
        ax.set_xlabel("Time (s)"); ax.set_ylabel("Voltage")
        ax.set_title(f"{tag} — Detected Patterns  (conf ≥ 0.5)", fontweight="bold")
        ax.grid(True, alpha=0.2)
        plt.tight_layout()
        fig.savefig(out_dir / filename, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"[Plot] {out_dir / filename}")

    # 4 — LSTM future prediction
    if lstm_result is not None:
        preds = lstm_result.get("predictions", [])
        conf_scores = lstm_result.get("confidence_scores", [])
        if preds:
            tail_n = min(120, len(times))
            t_tail = times[-tail_n:]
            v_tail = voltages[-tail_n:]
            dt = (t_tail[-1] - t_tail[0]) / max(tail_n - 1, 1)
            t_future = np.array([t_tail[-1] + dt * (i + 1) for i in range(len(preds))])
            preds_arr = np.array(preds, dtype=float)
            fig, ax = plt.subplots(figsize=(12, 3.5))
            ax.plot(t_tail, v_tail, color="steelblue", linewidth=1.2, label="Observed (tail)")
            ax.plot(t_future, preds_arr, color="crimson", linewidth=1.5,
                    linestyle="--", label="Predicted future")
            if conf_scores:
                uncertainty = (1.0 - np.array(conf_scores)) * float(np.std(v_tail))
                ax.fill_between(t_future, preds_arr - uncertainty, preds_arr + uncertainty,
                                color="crimson", alpha=0.15, label="Uncertainty band")
            ax.axvline(t_tail[-1], color="black", linewidth=1.0, linestyle=":", label="Now")
            ax.set_xlabel("Time (s)"); ax.set_ylabel("Voltage")
            ax.set_title("LSTM — Future Voltage Prediction", fontweight="bold")
            ax.legend(loc="upper left", fontsize=9)
            ax.grid(True, alpha=0.25)
            plt.tight_layout()
            fig.savefig(out_dir / "smoke_04_lstm_predictions.png", dpi=150, bbox_inches="tight")
            plt.close(fig)
            print(f"[Plot] {out_dir / 'smoke_04_lstm_predictions.png'}")

    # 5 — Model comparison (confidence + inference time)
    model_names = ["RF\nPattern", "CNN\nExploration", "LSTM\nPredict"]
    conf_vals = [
        rf_result.get("confidence_score", 0.0)   if rf_result   else 0.0,
        cnn_result.get("confidence_score", 0.0)  if cnn_result  else 0.0,
        lstm_result.get("confidence_score", 0.0) if lstm_result else 0.0,
    ]
    time_vals = [rf_ms, cnn_ms, lstm_ms]
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
    bars1 = ax1.bar(model_names, conf_vals, color=colors, edgecolor="white")
    ax1.set_ylim(0, 1.1); ax1.set_ylabel("Confidence score")
    ax1.set_title("Overall Confidence Score", fontweight="bold")
    for bar, v in zip(bars1, conf_vals):
        ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.02,
                 f"{v:.3f}", ha="center", fontsize=10)

    bars2 = ax2.bar(model_names, time_vals, color=colors, edgecolor="white")
    ax2.set_ylabel("Inference time (ms)")
    ax2.set_title("Inference Time", fontweight="bold")
    for bar, v in zip(bars2, time_vals):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(time_vals) * 0.01,
                 f"{v:.1f} ms", ha="center", fontsize=10)

    fig.suptitle("Model Comparison — Smoke Test", fontweight="bold", fontsize=13)
    plt.tight_layout()
    fig.savefig(out_dir / "smoke_05_model_comparison.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {out_dir / 'smoke_05_model_comparison.png'}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Smoke-test exported ML model artifacts"
    )
    parser.add_argument(
        "--sample-input",
        default="sample_time_voltage.xlsx",
        help="Backend-style Time+Voltage file (.xlsx or .csv)",
    )
    parser.add_argument("--model-dir", default="outputs/models")
    parser.add_argument("--output-dir", default="outputs/smoke_tests")
    args = parser.parse_args()

    sample_path = _resolve_sample_path(args.sample_input)
    print(f"Loading sample input: {sample_path}")
    raw_frame = load_sample_input(sample_path)
    frame = preprocess_inference_frame(raw_frame)
    print(f"Preprocessed: {len(frame)} rows, columns: {frame.columns.tolist()}")

    model_dir = Path(args.model_dir)
    out_dir = Path(args.output_dir)

    rf_result, rf_ms = run_one(
        "RF Pattern Detection",
        model_dir / "rf_pattern_detection.pkl",
        frame,
        {"window_size": 20, "threshold": 0.5},
        out_dir / "rf_smoke_output.json",
    )

    cnn_result, cnn_ms = run_one(
        "CNN Custom Exploration",
        model_dir / "cnn_custom_exploration.pkl",
        frame,
        {"window_size": 20, "threshold": 0.5, "model_selection": "cnn"},
        out_dir / "cnn_smoke_output.json",
    )

    lstm_result, lstm_ms = run_one(
        "LSTM Predict Future",
        model_dir / "lstm_predict_future.pkl",
        frame,
        {"window_size": 20, "prediction_window": 20},
        out_dir / "lstm_smoke_output.json",
    )

    _save_smoke_plots(
        frame,
        rf_result, rf_ms,
        cnn_result, cnn_ms,
        lstm_result, lstm_ms,
        out_dir / "plots",
    )

    print(f"\n{'=' * 60}")
    print("All smoke tests complete.")
    print(f"Outputs: {out_dir}")


if __name__ == "__main__":
    main()
