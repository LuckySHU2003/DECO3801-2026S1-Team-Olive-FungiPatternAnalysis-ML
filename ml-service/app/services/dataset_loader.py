from pathlib import Path

import pandas as pd

from app.dto.schemas import DatasetRef
from app.services.file_cache import download_to_cache


class DatasetValidationError(ValueError):
    pass


async def load_dataset(dataset: DatasetRef) -> pd.DataFrame:
    local_path = await download_to_cache(str(dataset.file_url))
    return read_tabular_file(local_path, dataset)


def read_tabular_file(path: Path, dataset: DatasetRef) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in [".csv", ".txt"]:
        frame = pd.read_csv(path)
    elif suffix in [".xlsx", ".xls"]:
        frame = pd.read_excel(path)
    else:
        try:
            frame = pd.read_csv(path)
        except Exception as csv_error:
            try:
                frame = pd.read_excel(path)
            except Exception as excel_error:
                raise DatasetValidationError(f"Unsupported dataset format for {path.name}. CSV/XLSX expected.") from excel_error

    return validate_and_standardize_columns(frame, dataset.columns.time, dataset.columns.voltage)


def validate_and_standardize_columns(frame: pd.DataFrame, time_col: str, voltage_col: str) -> pd.DataFrame:
    missing = [col for col in [time_col, voltage_col] if col not in frame.columns]
    if missing:
        raise DatasetValidationError(f"Dataset missing required columns: {', '.join(missing)}")

    clean = frame[[time_col, voltage_col]].rename(columns={time_col: "Time", voltage_col: "Voltage"}).copy()
    clean["Time"] = pd.to_numeric(clean["Time"], errors="coerce")
    clean["Voltage"] = pd.to_numeric(clean["Voltage"], errors="coerce")
    if clean.empty:
        raise DatasetValidationError("Dataset contains no rows")
    return clean
