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
) -> None:
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  {label}")
    print(sep)

    if not model_path.exists():
        print(f"  SKIP — model not found: {model_path}")
        return

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

    run_one(
        "RF Pattern Detection",
        model_dir / "rf_pattern_detection.pkl",
        frame,
        {"window_size": 20, "threshold": 0.5},
        out_dir / "rf_smoke_output.json",
    )

    run_one(
        "CNN Custom Exploration",
        model_dir / "cnn_custom_exploration.pkl",
        frame,
        {"window_size": 20, "threshold": 0.5, "model_selection": "cnn"},
        out_dir / "cnn_smoke_output.json",
    )

    run_one(
        "LSTM Predict Future",
        model_dir / "lstm_predict_future.pkl",
        frame,
        {"window_size": 20, "prediction_window": 20},
        out_dir / "lstm_smoke_output.json",
    )

    print(f"\n{'=' * 60}")
    print("All smoke tests complete.")
    print(f"Outputs: {out_dir}")


if __name__ == "__main__":
    main()
