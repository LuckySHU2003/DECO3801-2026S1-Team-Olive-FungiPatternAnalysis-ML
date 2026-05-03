import pandas as pd
import numpy as np
from scipy.signal import find_peaks

def load_dataset(file_path, sheet_name=0):
    """Load dataset"""
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)

    elif file_path.endswith(".xlsx"):
        df = pd.read_excel(file_path, sheet_name=sheet_name)

    else:
        raise ValueError("This file type is not supported.")
    
    return df

def detect_columns(df):
    """Use first column as time column and remaining columns as voltage columns."""
    
    time_col = df.columns[0]
    voltage_col = list(df.columns[1:])
    
    return time_col, voltage_col


def validate_dataset(df, time_col=None, voltage_col=None):
    """Validate dataset format."""
    
    # check if there is a time column and at least one voltage column
    if df.empty:
        raise ValueError("The provided dataset is empty.")
    
    if df.shape[1] < 2:
        raise ValueError("Dataset must contain time and voltage columns.")

    # if time_col is list, take the first one
    if isinstance(time_col, list):
        time_col = time_col[0]
    # if time_col is None, use the first column
    elif time_col is None:
        time_col = df.columns[0]

    # if voltage_col is None, use all columns except the time column
    if voltage_col is None:
        voltage_col = df.columns[1:].tolist()
    
    # if voltage_col is a string convert it to a list
    elif isinstance(voltage_col, str):
        voltage_col = [voltage_col]

    # Convert time column to datetime
    df[time_col] = pd.to_datetime(df[time_col], errors="coerce")

    if df[time_col].isnull().any():
        raise ValueError("Invalid values in time column.")

    # Convert voltages to numeric
    for col in voltage_col:
        df[col] = pd.to_numeric(df[col], errors="coerce")

        if df[col].isnull().any():
            raise ValueError("Invalid values in the column")

    # sort by time column
    df = df.sort_values(by=time_col).reset_index(drop=True)

    return df

def noise_reduction(df, window_val=5): 
    """Apply rolling mean to reduce noise."""
    voltage_col = df.columns[1:]
    for col in voltage_col:
        df[col] = df[col].rolling(window=window_val, center=True, min_periods=1).mean()
    return df

def baseline_stabilisation(df, voltage_col, window_val=100):
    """Subtract rolling mean to stabilise the baseline."""
    baseline = df[voltage_col].rolling(window=window_val, center=True, min_periods=1).mean()
    df[voltage_col] = df[voltage_col] - baseline
    return df

def extract_features_from_data(df, time_col, voltage_col, window_size, step):
    """Extract features from data"""
    features = []
    if len(df) < window_size:
        return pd.DataFrame()
    
    # iterate through the signal in windows and extract features
    for start in range(0, len(df) - window_size + 1, step):
        end = start + window_size
        window_df = df.iloc[start:end]
        signal = np.asarray(window_df[voltage_col]).flatten()
        
        if np.isnan(signal).any():
            continue
        if np.std(signal) == 0:
            continue

        z = (signal - np.mean(signal)) / np.std(signal)
        threshold = np.percentile(z, 80)
        peaks, _ = find_peaks(z, height=threshold)
        peak_values = signal[peaks]

        frequency = len(peaks) / window_size
        if len(peak_values) > 0:
            amplitude_mean = np.mean(peak_values)
            amplitude_max = np.max(peak_values)
        else:
            amplitude_mean = 0
            amplitude_max = 0

        if len(peaks) > 1:
            spike_intervals = np.diff(peaks)
            spike_interval_mean = np.mean(spike_intervals)
            spike_interval_std = np.std(spike_intervals)
        else:
            spike_interval_mean = 0
            spike_interval_std = 0

        features.append({
            "start_index": start,   
            "end_index": end,
            "voltage": voltage_col,
            "start_time": window_df[time_col].iloc[0], 
            "end_time": window_df[time_col].iloc[-1],
            "frequency": frequency,
            "amplitude_mean": amplitude_mean,
            "amplitude_max": amplitude_max,
            "spike_interval_mean": spike_interval_mean,
            "spike_interval_std": spike_interval_std
        })

    return pd.DataFrame(features)



  


