from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent

INPUT_PATH = BASE_DIR / "data" / "data.xlsx"
OUTPUT_PATH = BASE_DIR / "data" / "processed_data.csv"

SOURCE_SHEET = "sheet name"  # change to your actual sheet name
TIME_COL = "Time"
ADC1_COL = "ADC1 (green)"


def main():
    df = pd.read_excel(INPUT_PATH, sheet_name=SOURCE_SHEET)

    processed = df[[TIME_COL, ADC1_COL]].copy()
    processed.columns = ["Time", "Voltage"]

    processed["Time"] = pd.to_datetime(processed["Time"], errors="coerce")
    processed["Voltage"] = pd.to_numeric(processed["Voltage"], errors="coerce")

    processed = processed.dropna()

    # convert to seconds (relative time)
    start_time = processed["Time"].iloc[0]
    processed["Time"] = (processed["Time"] - start_time).dt.total_seconds()

    processed = processed.sort_values("Time").reset_index(drop=True)

    processed.to_csv(OUTPUT_PATH, index=False)

    print(f"Saved processed dataset to: {OUTPUT_PATH}")
    print(processed.head())


if __name__ == "__main__":
    main()