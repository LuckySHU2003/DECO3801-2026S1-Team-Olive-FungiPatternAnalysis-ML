import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import KFold

import pickle 

from DataPreparation import (
    load_dataset,      
    detect_columns,         
    validate_dataset              
)

def predict_future(model, signal, seq_length=50, step = 20):

    model.eval()
    num_features = signal.shape[1]

    input_seq = signal[-seq_length:].copy()
    predictions = []

    for _ in range(step):

        x = torch.tensor(input_seq, dtype=torch.float32)
        x = x.view(1, seq_length, num_features)

        with torch.no_grad():
            pred = model(x).cpu().numpy()

        predictions.append(pred.flatten())
        pred_reshaped = pred.reshape(1, num_features)

        input_seq = np.vstack([input_seq[1:], pred_reshaped])

    return np.array(predictions)

def create_sequences(signal, seq_length=50):

    X = []
    y = []

    if len(signal.shape) > 1:
        num_features = signal.shape[1]
    else:
        num_features = 1

    for i in range(len(signal) - seq_length):

        X.append(signal[i:i+seq_length, :]) 
        y.append(signal[i+seq_length, :])

    X = np.array(X)
    y = np.array(y)

    X = X.reshape((X.shape[0], X.shape[1], num_features))
    return X, y

def extract_predicted_attributes(pred_signal):

    # amplitude
    amplitude = np.max(pred_signal)

    # frequency (peak count / length)
    peaks, _ = find_peaks(pred_signal)
    frequency = len(peaks) / len(pred_signal)

    # interval between spikes
    if len(peaks) > 1:
        interval = np.mean(np.diff(peaks))
    else:
        interval = 0

    return {
        "amplitude": amplitude,
        "frequency": frequency,
        "interval": interval
    }

class VoltageLSTM(nn.Module):

    def __init__(self, input_size, hidden_size=64):

        super(VoltageLSTM, self).__init__()

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=2,
            batch_first=True,
            dropout=0.1
        )

        self.fc = nn.Linear(hidden_size, input_size)

    def forward(self, x):

        output, _ = self.lstm(x)

        return self.fc(output[:, -1, :])
    
def train_lstm_kfold(X, y, hidden_size=32, epochs=20, batch_size=64, n_splits=5):

    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    fold_models = []

    for fold, (train_index, val_index) in enumerate(kf.split(X)):


        X_train, y_train = X[train_index], y[train_index]
        X_val, y_val = X[val_index], y[val_index]

        model = VoltageLSTM(input_size=X.shape[2], hidden_size=hidden_size)

        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

        train_dataset = torch.utils.data.TensorDataset(
            torch.tensor(X_train, dtype=torch.float32),
            torch.tensor(y_train, dtype=torch.float32)
        )

        train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        for epoch in range(epochs):

            model.train()

            for X_batch, y_batch in train_loader:

                optimizer.zero_grad()

                predictions = model(X_batch)

                loss = criterion(predictions, y_batch)

                loss.backward()
                optimizer.step()

        fold_models.append(model)

    return fold_models


def predict_lstm(model, X_test):

    model.eval()

    with torch.no_grad():

        X_test_tensor = torch.tensor(X_test, dtype=torch.float32).unsqueeze(-1)

        predictions = model(X_test_tensor).squeeze(-1).numpy()

    return predictions

def predict_lstm_ensemble(models, signal, seq_length=50, step=20):
    if not isinstance(models, list):
        models = [models]

    all_predictions = []

    for model in models:

        preds = predict_future(model, signal, seq_length, step)

        all_predictions.append(preds)

    mean_predictions = np.mean(all_predictions, axis=0)
    std_predictions = np.std(all_predictions, axis=0)

    return mean_predictions, std_predictions

def run_job5(payload):
    dataset_config = payload['dataset']
    pred_config = payload['prediction_config']
    model_info = payload['model']

    df = load_dataset(dataset_config['path'])
    time_col = dataset_config['columns']['time']
    voltage_col = dataset_config['columns']['voltage']
    time_col, voltage_col = detect_columns(df)
    df = validate_dataset(df, time_col, voltage_col)

    if isinstance(voltage_col, (list, pd.Index)):
        voltage_list = list(voltage_col)
    else:
        voltage_list = [voltage_col]

    if isinstance(time_col, list):
        time_col = time_col[0]

    signal_raw = df[voltage_list].values.astype(np.float32)
    scaler = MinMaxScaler(feature_range=(0, 1))
    signal_scaled = scaler.fit_transform(signal_raw)

    window_size = 50
    steps_to_predict = pred_config['prediction_window']

    ensemble = []
    try:
        with open(model_info['path'], 'rb') as f:
            loaded_data = pickle.load(f)
            ensemble = loaded_data if isinstance(loaded_data, list) else [loaded_data]
    except (FileNotFoundError, EOFError):
        print("Model file not found or empty.")

    X_train, y_train = create_sequences(signal_scaled, window_size)
    ensemble = train_lstm_kfold(X_train, y_train, hidden_size=32, epochs=20, batch_size=64, n_splits=5)

    with open(model_info['path'], 'wb') as f:
            pickle.dump(ensemble, f)

    future_mean_scaled, future_std_scaled = predict_lstm_ensemble(
        ensemble, signal_scaled, window_size, steps_to_predict
    )
    future_voltage = scaler.inverse_transform(future_mean_scaled)
    

    last_time = pd.to_datetime(df[time_col].iloc[-1]).timestamp()
    future_times = [last_time + i + 1 for i in range(steps_to_predict)]

    prediction_list = []
    for i in range(len(future_times)):
        point_uncertainty = float(np.mean(future_std_scaled[i]))
        conf = max(0.1, 1.0 - point_uncertainty)

        prediction_list.append({
            "time": float(future_times[i]),
            "predicted_voltage": float(future_voltage[i][0]),
            "confidence_score": conf
    })
    
    avg_conf = np.mean([p["confidence_score"] for p in prediction_list])
    response = {
        "job": payload["job"],
        "status": "success",
        "model_used": model_info["name"],
        "prediction_window": steps_to_predict,
        "predicted_voltage_window": prediction_list,
        "summary": {
            "start_time": float(future_times[0]),
            "end_time": float(future_times[-1]),
            "min_predicted_voltage": float(np.min(future_voltage)),
            "max_predicted_voltage": float(np.max(future_voltage)),
            "average_predicted_voltage": float(np.mean(future_voltage)),
            "average_confidence_score": avg_conf
        }
    }
    return response

