import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from app.dto.schemas import DatasetColumns, DatasetRef
from app.services.file_cache import download_to_cache

logger = logging.getLogger("ml-service")


class DatasetValidationError(ValueError):
    pass


async def load_dataset(dataset: DatasetRef) -> pd.DataFrame:
    """Download and parse a dataset given a pre-resolved file_url."""
    if not dataset.file_url:
        raise DatasetValidationError("dataset.file_url is required when dataset_id is not provided")
    local_path = await download_to_cache(str(dataset.file_url))
    return read_tabular_file(local_path, dataset)


async def resolve_and_load_dataset(dataset: DatasetRef) -> pd.DataFrame:
    """
    Resolve dataset by dataset_id (Option A) or fall back to file_url.
    When dataset_id is present: look up MongoDB, generate Supabase signed URL, download.
    """
    if dataset.dataset_id:
        from app.services.mongo_resolver import resolve_dataset
        from app.services.supabase_storage import generate_signed_url

        doc = await resolve_dataset(dataset.dataset_id)

        url: Optional[str] = None
        bucket = doc.get("bucket")
        storage_path = doc.get("storage_path")
        if bucket and storage_path:
            url = await generate_signed_url(bucket, storage_path)
            if url:
                logger.info("Using signed URL for dataset %r", dataset.dataset_id)

        if not url:
            url = doc.get("file_url")
            if url:
                logger.info("Falling back to file_url for dataset %r", dataset.dataset_id)

        if not url:
            raise DatasetValidationError(
                f"No download URL available for dataset {dataset.dataset_id!r}. "
                "Ensure bucket/storage_path or file_url is set in MongoDB."
            )

        resolved = DatasetRef(
            source=dataset.source,
            dataset_id=dataset.dataset_id,
            file_url=url,
            storage_path=storage_path,
            columns=dataset.columns,
        )
        return await load_dataset(resolved)

    return await load_dataset(dataset)


def read_tabular_file(path: Path, dataset: DatasetRef) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in [".csv", ".txt"]:
        frame = pd.read_csv(path)
    elif suffix in [".xlsx", ".xls"]:
        frame = pd.read_excel(path)
    else:
        try:
            frame = pd.read_csv(path)
        except Exception:
            try:
                frame = pd.read_excel(path)
            except Exception as excel_error:
                raise DatasetValidationError(
                    f"Unsupported dataset format for {path.name}. CSV/XLSX expected."
                ) from excel_error

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
