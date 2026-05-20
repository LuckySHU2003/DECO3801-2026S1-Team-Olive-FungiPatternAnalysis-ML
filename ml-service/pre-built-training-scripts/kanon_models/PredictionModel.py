import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import pickle 
from scipy.signal import find_peaks
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import KFold


from DataPreparation import (
    load_dataset,      
    detect_columns,         
    validate_dataset              
)

def create_sequences(signal, seq_length=50):
    """Create sequences for LSTM training."""
    X = []
    y = []

    # determine the number of features in the signal
    if len(signal.shape) > 1:
        num_features = signal.shape[1]
    else:
        num_features = 1

    # create sequences of the specified length and corresponding targets
    for i in range(len(signal) - seq_length):
        X.append(signal[i:i+seq_length, :]) 
        y.append(signal[i+seq_length, :])

    # convert to numpy arrays 
    X = np.array(X)
    y = np.array(y)

    # reshape X to have the correct dimensions for LSTM input 
    X = X.reshape((X.shape[0], X.shape[1], num_features))
    return X, y

class VoltageLSTM(nn.Module):
    """LSTM model for voltage prediction."""
    def __init__(self, input_size, hidden_size=64):

        super(VoltageLSTM, self).__init__()

        # define LSTM layer and fully connected output layer
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=2,
            batch_first=True,
            dropout=0.1
        )

        self.fc = nn.Linear(hidden_size, input_size)

    def forward(self, x):

        # LSTM returns output 
        output, _ = self.lstm(x)

        return self.fc(output[:, -1, :])
    
def train_lstm_kfold(X, y, hidden_size=32, epochs=20, batch_size=64, n_splits=5):
    """Train LSTM using K-Fold cross-validation."""

    # create K-Fold splits and train a model on each fold
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    fold_models = []

    # loop through each fold and train a model
    for fold, (train_index, val_index) in enumerate(kf.split(X)):

        # split data into training and validation sets for the current fold
        X_train, y_train = X[train_index], y[train_index]
        X_val, y_val = X[val_index], y[val_index]

        # initialise the LSTM model, loss function, and optimiser
        model = VoltageLSTM(input_size=X.shape[2], hidden_size=hidden_size)
        loss_function = nn.MSELoss()
        optimiser = torch.optim.Adam(model.parameters(), lr=0.001)

        # create dataloader for training data
        train_dataset = torch.utils.data.TensorDataset(
            torch.tensor(X_train, dtype=torch.float32),
            torch.tensor(y_train, dtype=torch.float32)
        )

        train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        # train the model for the specified number of epochs
        for epoch in range(epochs):

            model.train()

            for X_batch, y_batch in train_loader:

                optimiser.zero_grad()

                predictions = model(X_batch)

                loss = loss_function(predictions, y_batch)

                loss.backward()
                optimiser.step()

        fold_models.append(model)

    return fold_models

def predict_future(model, signal, seq_length=50, step=20):
    """Predict future values using the trained LSTM model."""
    model.eval()
    num_features = signal.shape[1]

    # start with the last sequence from the signal and iteratively predict future values
    input_seq = signal[-seq_length:].copy()
    predictions = []

    # predict future values for the specified number of steps
    for _ in range(step):

        x = torch.tensor(input_seq, dtype=torch.float32)
        x = x.view(1, seq_length, num_features)

        with torch.no_grad():
            pred = model(x).numpy()

        predictions.append(pred.flatten())
        pred_reshaped = pred.reshape(1, num_features)

        # update the input sequence by removing the oldest value and adding the new prediction
        input_seq = np.vstack([input_seq[1:], pred_reshaped])

    return np.array(predictions)

def predict_lstm_ensemble(models, signal, seq_length=50, step=20):
    """Predict future values using an ensemble of LSTM models."""

    # ensure models is a list even if a single model is provided
    if not isinstance(models, list):
        models = [models]

    all_predictions = []

    # predict future values with each model in the ensemble and store the predictions
    for model in models:

        preds = predict_future(model, signal, seq_length, step)

        all_predictions.append(preds)

    # calculate the mean and standard deviation of the predictions across the ensemble
    mean_predictions = np.mean(all_predictions, axis=0)
    std_predictions = np.std(all_predictions, axis=0)

    return mean_predictions, std_predictions

def model_uncertainty(ensemble, X_train, y_train):
    """Calculate the average uncertainty on known data."""

    # ensure ensemble is a list even if a single model is provided
    all_preds = []
    for model in ensemble:
        model.eval()
        with torch.no_grad():
            all_preds.append(model(torch.tensor(X_train)).numpy())
    
    mean_train_pred = np.mean(all_preds, axis=0)
    # Mean Absolute Error on the scaled data
    training_mae = np.mean(np.abs(mean_train_pred - y_train))
    return training_mae

def run_job5(payload):
    # extract necessary information from the payload
    dataset_config = payload['dataset']
    pred_config = payload['prediction_config']
    model_info = payload['model']

    # load and validate the dataset
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

    # preprocess the signal by scaling it to the range [0, 1] using MinMaxScaler
    signal_raw = df[voltage_list].values.astype(np.float32)
    scaler = MinMaxScaler(feature_range=(0, 1))
    signal_scaled = scaler.fit_transform(signal_raw)

    window_size = 50
    steps_to_predict = pred_config['prediction_window']

    # train the LSTM ensemble and save the models to a file for future use
    ensemble = []
    try:
        with open(model_info['path'], 'rb') as f:
            loaded_data = pickle.load(f)
            ensemble = loaded_data if isinstance(loaded_data, list) else [loaded_data]
    except (FileNotFoundError, EOFError):
        print("Model file not found or empty.")

    # if no models were loaded, train a new ensemble and save it
    X_train, y_train = create_sequences(signal_scaled, window_size)
    ensemble = train_lstm_kfold(X_train, y_train, hidden_size=32, epochs=20, batch_size=64, n_splits=5)

    with open(model_info['path'], 'wb') as f:
            pickle.dump(ensemble, f)

    future_mean_scaled, future_std_scaled = predict_lstm_ensemble(
        ensemble, signal_scaled, window_size, steps_to_predict
    )
    future_voltage = scaler.inverse_transform(future_mean_scaled)
    
    # generate future timestamps for the predictions based on the last timestamp in the dataset
    last_time = pd.to_datetime(df[time_col].iloc[-1]).timestamp()
    future_times = [last_time + i + 1 for i in range(steps_to_predict)]

    #  calculate the confidence score for each prediction based on the model uncertainty 
    train_mae = model_uncertainty(ensemble, X_train, y_train)
    prediction_list = []
    for i in range(len(future_times)):
        conf = np.exp(-train_mae)

        prediction_list.append({
            "time": float(future_times[i]),
            "predicted_voltage": float(future_voltage[i][0]),
            "confidence_score": conf
    })
    
    # calculate the average confidence score 
    avg_conf = np.mean([p["confidence_score"] for p in prediction_list])

    output = {
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
    return output



payload = {
    "job": "multi_channel_prediction",
    "dataset": {
        "source": "local_file",
        "path": "lions_mane_100_samples.xlsx",
        "columns": {
            "time": "Timestamp",
            "voltage": "ADC1 (green)"
}
    },
    "preprocessing": {
        "mode": "raw"
    },
    "prediction_config": {
        "prediction_window": 15,
        "model_selection": "lstm"
    },
    "model": {
        "name": "LSTM",
        "type": "pkl",
        "path": "multi_adc_model.pkl"
    }
}


print("Running Job 5 Analysis")

output = run_job5(payload)

print("JOB 5 SUMMARY")
print(f"Status: {output['status']}")
print(f"Model Used: {output['model_used']}")
print(f"Prediction Window: {output['prediction_window']}")

print("\n--- SUMMARY STATISTICS ---")
print(f"Start Time: {output['summary']['start_time']}")
print(f"End Time: {output['summary']['end_time']}")
print(f"Min Predicted Voltage: {output['summary']['min_predicted_voltage']}")
print(f"Max Predicted Voltage: {output['summary']['max_predicted_voltage']}")
print(f"Average Voltage: {output['summary']['average_predicted_voltage']}")
print(f"Average Confidence: {output['summary']['average_confidence_score']}")

print("FIRST 3 PREDICTIONS")
for p in output["predicted_voltage_window"][:3]:
    print(p)


