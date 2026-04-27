import joblib
import torch
import torch.nn as nn
import numpy as np

class SimpleLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=16, output_size=50):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])

def load_model(model_path: str, model_type: str):
    if model_type == "pkl":
        model = joblib.load(model_path)
        return wrap_sklearn_model(model)

    if model_type == "pt":
        checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)

        if checkpoint["model_name"] == "simple_lstm":
            model = SimpleLSTM(
                input_size=checkpoint["input_size"],
                hidden_size=checkpoint["hidden_size"],
                output_size=checkpoint["output_size"]
            )
        else:
            raise ValueError(f"Unsupported pt model: {checkpoint['model_name']}")

        model.load_state_dict(checkpoint["state_dict"])
        model.eval()

        return wrap_torch_model(model)

    raise ValueError(f"Unsupported model type: {model_type}")


# =========================
# Wrappers (STANDARD INTERFACE)
# =========================

def wrap_sklearn_model(model):
    def run_inference(data, config):
        voltage = data["Voltage"].values.reshape(-1, 1)

        preds = model.predict(voltage)

        # basic pattern simulation
        patterns = []
        recurrence = {}

        for i, p in enumerate(preds):
            pattern_type = str(p)
            recurrence[pattern_type] = recurrence.get(pattern_type, 0) + 1

            patterns.append({
                "pattern_id": f"p{i}",
                "type": pattern_type,
                "start_time": float(data["Time"].iloc[i]),
                "end_time": float(data["Time"].iloc[i]),
                "snapshot": [],
                "frequency": 1.0,
                "amplitude": float(voltage[i][0]),
                "interval": 1.0,
                "confidence_score": 0.8
            })

        return {
            "patterns": patterns,
            "summary": {
                "total_patterns": len(patterns),
                "recurrence": recurrence,
                "average_frequency": 1.0,
                "average_amplitude": float(np.mean(voltage)),
                "average_interval": 1.0
            },
            "confidence_score": 0.8
        }

    return run_inference


def wrap_torch_model(model):
    def run_inference(data, config):
        voltage = data["Voltage"].values.astype(np.float32)
        tensor = torch.tensor(voltage).unsqueeze(0).unsqueeze(-1)

        with torch.no_grad():
            output = model(tensor).squeeze().numpy()

        window = config.get("prediction_window", 50)
        predicted = output[:window]

        time = data["Time"].values
        last_time = float(time[-1])
        step = float(np.median(np.diff(time)))

        predicted_window = []

        for i, val in enumerate(predicted):
            predicted_window.append({
                "time": last_time + (i + 1) * step,
                "predicted_voltage": float(val),
                "confidence_score": 0.8
            })

        values = [p["predicted_voltage"] for p in predicted_window]

        return {
            "predicted_voltage_window": predicted_window,
            "summary": {
                "start_time": predicted_window[0]["time"],
                "end_time": predicted_window[-1]["time"],
                "min_predicted_voltage": float(np.min(values)),
                "max_predicted_voltage": float(np.max(values)),
                "average_predicted_voltage": float(np.mean(values)),
                "average_confidence_score": 0.8
            },
            "confidence_score": 0.8
        }

    return run_inference


def run_inference(model_fn, data, config):
    return model_fn(data, config)