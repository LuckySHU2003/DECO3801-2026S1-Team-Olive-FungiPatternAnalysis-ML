import pandas as pd
import numpy as np
from scipy.signal import find_peaks

def load_dataset(file_path, sheet_name=None):
    """Load dataset."""
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)

    elif file_path.endswith(".xlsx"):
        df = pd.read_excel(file_path, sheet_name=sheet_name)

    else:
        raise ValueError("This file type is not supported. Please provide a .csv or .xlsx file.")
    
    return df

def detect_columns(df):
    """Detect time and voltage columns."""
    time_col = None
    voltage_col = None

    for col in df.columns:
        if "time" in col.lower():
            time_col = col
        elif "volt" in col.lower():
            voltage_col = col

    if time_col is None:
        raise ValueError("Time column not found.")
    if voltage_col is None:
        raise ValueError("Voltage column not found.")
    return time_col, voltage_col

def validate_dataset(df, time_col="time", voltage_col="voltage"):
    """Validate dataset."""
    if time_col not in df.columns:
        raise ValueError("Time column not found in dataset.")
    if voltage_col not in df.columns:
        raise ValueError("Voltage column not found in dataset.")
    
    #convert time to datetime and voltage to numeric, coercing errors to NaN
    df[time_col] = pd.to_datetime(df[time_col], errors="coerce")
    df[voltage_col] = pd.to_numeric(df[voltage_col], errors="coerce")
    
    #check for null values
    if df[time_col].isnull().any():
        raise ValueError("Time column contains null values.")
    if df[voltage_col].isnull().any():
        raise ValueError("Voltage column contains null values.")
    
    df = df.sort_values(by=time_col)

    return df

def noise_reduction(df, voltage_col="voltage", window=5):
    """Apply moving average filter for noise reduction."""
    df[voltage_col] = df[voltage_col].rolling(window=window, center=True).mean()
    return df

def baseline_stabilisation(df, signal_col, window=50):
    """Apply baseline stabilisation."""
    baseline = df[signal_col].rolling(window=window, center=True).mean()
    df[signal_col] = df[signal_col] - baseline
    return df

def extract_features_from_signal(df, time_col="time", signal_col="voltage",
                                 window_size=100, step=50):
    features = []
    for i in range(0, len(df) - window_size, step):
        window = df.iloc[i:i+window_size]
        signal = window[signal_col].values
       
        #normalise the signal
        if np.std(signal) == 0:
            continue
        z = (signal - np.mean(signal)) / np.std(signal)
        
        #detect peaks
        peaks, _ = find_peaks(z, height=2.5)
        peak_values = signal[peaks]

        #frequency
        frequency = len(peaks) / window_size

        #amplitude
        if len(peak_values) > 0:
            amplitude_mean = np.mean(peak_values)
        else:
            amplitude_mean = 0
        if len(peak_values) > 0:
            amplitude_max = np.max(peak_values)
        else:
            amplitude_max = 0

        #spike intervals
        if len(peaks) > 1:
            spike_intervals = np.diff(peaks)
            spike_interval_mean = np.mean(spike_intervals)
            spike_interval_std = np.std(spike_intervals)
        else:
            spike_interval_mean = 0
            spike_interval_std = 0
        


    

