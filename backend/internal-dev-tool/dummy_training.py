import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "processed_data.csv" #Optional: change to your preffered csv name
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_csv(DATA_PATH)

X = df[["Voltage"]].values
y = (df["Voltage"] > df["Voltage"].mean()).astype(int)  # simple label

# =========================
# RF model (Job 2/3/4)
# =========================
rf = RandomForestClassifier()
rf.fit(X, y)

joblib.dump(rf, MODEL_DIR / "rf_pattern.pkl")


# =========================
# LSTM (Job 5)
# =========================
class SimpleLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(1, 16, batch_first=True)
        self.fc = nn.Linear(16, 50)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


model = SimpleLSTM()

# fake training (just to make it work)
optimizer = torch.optim.Adam(model.parameters())
loss_fn = nn.MSELoss()

tensor_x = torch.tensor(X, dtype=torch.float32).unsqueeze(0)

for _ in range(10):
    optimizer.zero_grad()
    out = model(tensor_x)
    loss = loss_fn(out, torch.zeros_like(out))
    loss.backward()
    optimizer.step()

torch.save(
    {
        "model_name": "simple_lstm",
        "state_dict": model.state_dict(),
        "input_size": 1,
        "hidden_size": 16,
        "output_size": 50
    },
    MODEL_DIR / "lstm_model.pt"
)

print("Models exported")