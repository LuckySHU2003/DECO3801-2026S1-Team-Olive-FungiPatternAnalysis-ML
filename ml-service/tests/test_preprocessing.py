import pandas as pd

from app.dto.schemas import PreprocessingConfig
from app.services.preprocessing import preprocess_time_voltage


def test_preprocess_interpolates_missing_voltage():
    df = pd.DataFrame({"Time": [0, 1, 2], "Voltage": [1.0, None, 3.0]})
    out = preprocess_time_voltage(df, PreprocessingConfig(mode="raw", normalize=False, missing_value_strategy="interpolate"))
    assert out["Voltage"].isna().sum() == 0
