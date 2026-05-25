"""Shared preprocessing utilities for training and runtime inference."""
from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd

TRAIN_ADC_COLS = ["ADC1 (green)", "ADC2 (yellow)", "ADC3 (orange)", "ADC4 (red)"]


# ---------------------------------------------------------------------------
# Training-file helpers
# ---------------------------------------------------------------------------

def load_training_file(path: str) -> pd.DataFrame:
    """Load first worksheet of training file; validate required columns."""
    p = Path(path)
    if p.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(path, sheet_name=0)
    else:
        df = pd.read_csv(path)
    required = ["Time"] + TRAIN_ADC_COLS
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing columns in training file: {missing}\n"
            f"Found: {df.columns.tolist()}"
        )
    return df[required].copy()


def parse_training_time(df: pd.DataFrame) -> pd.DataFrame:
    """Convert ISO8601 Time to float seconds_from_start, sort chronologically.

    Adds a 'seconds' column and drops rows with unparseable timestamps.
    """
    df = df.copy()
    df["_ts"] = pd.to_datetime(df["Time"], errors="coerce", utc=True)
    df = df.dropna(subset=["_ts"]).sort_values("_ts").reset_index(drop=True)
    t0 = df["_ts"].iloc[0]
    df["seconds"] = (df["_ts"] - t0).dt.total_seconds()
    df = df.drop(columns=["_ts"])
    return df


def clean_adc_columns(
    df: pd.DataFrame,
    clip_quantile: Optional[float] = None,
) -> pd.DataFrame:
    """Coerce to numeric, interpolate NaN, ffill/bfill, optional quantile clip.

    clip_quantile: if e.g. 0.01, clips bottom/top 1% per channel (conservative,
    leaves spikes intact by default when None).
    """
    df = df.copy()
    for col in TRAIN_ADC_COLS:
        if col not in df.columns:
            continue
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df[col] = df[col].interpolate(method="linear", limit_direction="both")
        df[col] = df[col].ffill().bfill()
        if clip_quantile is not None and 0.0 < clip_quantile < 0.5:
            lo = df[col].quantile(clip_quantile)
            hi = df[col].quantile(1.0 - clip_quantile)
            df[col] = df[col].clip(lo, hi)
    return df


def chronological_split(
    df: pd.DataFrame,
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split by row order, preserving chronological sequence."""
    n = len(df)
    i1 = int(n * train_frac)
    i2 = int(n * (train_frac + val_frac))
    return df.iloc[:i1].copy(), df.iloc[i1:i2].copy(), df.iloc[i2:].copy()


def get_channel_frames(df: pd.DataFrame) -> List[pd.DataFrame]:
    """Return one Time+Voltage DataFrame per ADC channel (uses 'seconds' column)."""
    frames = []
    for col in TRAIN_ADC_COLS:
        if col not in df.columns:
            continue
        sub = df[["seconds", col]].copy()
        sub.columns = ["Time", "Voltage"]
        frames.append(sub.reset_index(drop=True))
    return frames


# ---------------------------------------------------------------------------
# Runtime inference helpers
# ---------------------------------------------------------------------------

def preprocess_inference_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean a backend-style Time+Voltage DataFrame for inference."""
    if "Time" not in frame.columns or "Voltage" not in frame.columns:
        raise ValueError(
            f"Input frame must have 'Time' and 'Voltage' columns. "
            f"Got: {frame.columns.tolist()}"
        )
    df = frame[["Time", "Voltage"]].copy()
    df["Time"] = pd.to_numeric(df["Time"], errors="coerce")
    df["Voltage"] = pd.to_numeric(df["Voltage"], errors="coerce")
    df = df.dropna(subset=["Time"]).sort_values("Time").reset_index(drop=True)
    df["Voltage"] = df["Voltage"].interpolate(method="linear", limit_direction="both")
    df["Voltage"] = df["Voltage"].ffill().bfill().fillna(0.0)
    return df


# ---------------------------------------------------------------------------
# Windowing
# ---------------------------------------------------------------------------

def make_sliding_windows(
    arr: np.ndarray,
    window_size: int,
    step: int = 1,
) -> Tuple[np.ndarray, np.ndarray]:
    """Return (windows, start_indices) for a 1-D array via strided slicing."""
    n = len(arr)
    if n < window_size:
        return np.empty((0, window_size), dtype=float), np.empty(0, dtype=int)
    starts = np.arange(0, n - window_size + 1, step)
    windows = np.array([arr[s : s + window_size] for s in starts], dtype=float)
    return windows, starts


def resize_to(window: np.ndarray, target_size: int) -> np.ndarray:
    """Resample a 1-D window to target_size via linear interpolation."""
    w = np.asarray(window, dtype=float)
    if len(w) == target_size:
        return w
    x_old = np.linspace(0.0, 1.0, len(w))
    x_new = np.linspace(0.0, 1.0, target_size)
    return np.interp(x_new, x_old, w)


# ---------------------------------------------------------------------------
# Visualisation helpers  (training-only — lazy matplotlib import)
# ---------------------------------------------------------------------------

def plot_raw_signal(
    df: pd.DataFrame,
    out_path: str,
    title: str = "Raw ADC Channels",
) -> None:
    """Four-panel time-series plot of all ADC channels, saved to out_path."""
    try:
        import matplotlib.pyplot as plt
        plt.switch_backend("agg")
    except ImportError:
        return
    colors = ["#2ca02c", "#c7a917", "#e07b39", "#d62728"]
    t = df["seconds"] if "seconds" in df.columns else pd.Series(range(len(df)))
    fig, axes = plt.subplots(len(TRAIN_ADC_COLS), 1, figsize=(13, 8), sharex=True)
    for ax, col, color in zip(axes, TRAIN_ADC_COLS, colors):
        if col not in df.columns:
            continue
        ax.plot(t, df[col], color=color, linewidth=0.7, alpha=0.9)
        ax.set_ylabel("V", fontsize=8)
        ax.set_title(col, fontsize=9, loc="left", pad=2)
        ax.grid(True, alpha=0.25, linewidth=0.5)
    axes[-1].set_xlabel("Time (s)")
    fig.suptitle(title, fontsize=12, fontweight="bold")
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {out_path}")


def plot_data_split(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    out_path: str,
) -> None:
    """Single-channel signal coloured by train / val / test region."""
    try:
        import matplotlib.pyplot as plt
        plt.switch_backend("agg")
    except ImportError:
        return
    col = next((c for c in TRAIN_ADC_COLS if c in train_df.columns), None)
    if col is None or "seconds" not in train_df.columns:
        return
    fig, ax = plt.subplots(figsize=(13, 3.5))
    for part, label, color in [
        (train_df, f"Train  {len(train_df):,} rows", "#1f77b4"),
        (val_df,   f"Val    {len(val_df):,} rows",   "#ff7f0e"),
        (test_df,  f"Test   {len(test_df):,} rows",  "#d62728"),
    ]:
        ax.plot(part["seconds"], part[col], color=color, linewidth=0.8, label=label)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Voltage")
    ax.set_title(f"Chronological Train / Val / Test Split  —  {col}", fontweight="bold")
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(True, alpha=0.25)
    plt.tight_layout()
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[Plot] {out_path}")


# ---------------------------------------------------------------------------
# Feature extraction & pseudo-labelling
# ---------------------------------------------------------------------------

def extract_rf_features(window: np.ndarray) -> np.ndarray:
    """Compute 10 statistical features from a 1-D voltage window."""
    w = np.asarray(window, dtype=float)
    mean = float(np.mean(w))
    std = float(np.std(w))
    mn = float(np.min(w))
    mx = float(np.max(w))
    rng = mx - mn
    slope = float(np.polyfit(np.arange(len(w)), w, 1)[0]) if len(w) >= 2 else 0.0
    median = float(np.median(w))
    mad = float(np.mean(np.abs(w - mean)))
    # interior local maxima count
    peaks = int(np.sum((w[1:-1] > w[:-2]) & (w[1:-1] > w[2:]))) if len(w) > 2 else 0
    energy = float(np.sum(w ** 2))
    return np.array([mean, std, mn, mx, rng, slope, median, mad, peaks, energy], dtype=float)


def heuristic_label(
    window: np.ndarray,
    global_mean: float,
    global_std: float,
    spike_z: float = 2.0,
    unstable_std_mult: float = 1.5,
) -> str:
    """Assign a pseudo-label to a window based on global statistics.

    Labels: 'normal', 'spike', 'drop', 'unstable'.
    """
    eps = 1e-8
    w = np.asarray(window, dtype=float)
    z = (float(np.mean(w)) - global_mean) / (global_std + eps)
    if z > spike_z:
        return "spike"
    if z < -spike_z:
        return "drop"
    if float(np.std(w)) > unstable_std_mult * global_std:
        return "unstable"
    return "normal"
