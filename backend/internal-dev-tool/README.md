# Internal Dev Tool – ML Inference CLI

## Overview

This tool allows the ML team to run trained models locally in a standardized environment, independent from the backend. It simulates the full inference pipeline, including dataset retrieval, preprocessing, model invocation, and structured output generation.

The tool supports multiple model types (e.g., scikit-learn, PyTorch) while maintaining a consistent interface for downstream integration.

This tool already provided 4 templates for input payloads. You can customise the values to suit your need but do not change the payload structure.

---

## Project Structure

/backend/internal-dev-tool  
- cli.py — Entry point  
- jobs.py — Job orchestration (Jobs 2–5)  
- model_loader.py — Model loading and wrapper logic  
- preprocess_dataset.py — Dataset preprocessing  
- dummy_training.py — Example model training  

/data  
Put your xlsx file here. Processed data file is also here.

/inputs  
- pattern_detection.json  
- job3_custom_exploration.json  
- job4_correlation.json  
- prediction.json  

/models  
- *.pkl — scikit-learn models  
- *.pt — PyTorch models  

---

## Setup

Install dependencies:

pip install pandas numpy scipy scikit-learn torch

---

## Dataset Preprocessing

Convert raw dataset to standardized format (Time, Voltage):

python preprocess_dataset.py

Output:

/data/processed_data.csv

---

## Model Training (Optional)

Generate sample models:

python dummy_training.py

Output:

/models/rf_pattern.pkl  
/models/lstm_model.pt  

---

## Running Jobs

All operations are executed through the CLI.

Job 2 – Pattern Detection  
python cli.py --job job2 --input inputs/pattern_detection.json  

Job 3 – Custom Exploration  
python cli.py --job job3 --input inputs/job3_custom_exploration.json  

Job 4 – Correlation  (on-hold until having correlation dataset)
python cli.py --job job4 --input inputs/job4_correlation.json  

Job 5 – Prediction  
python cli.py --job job5 --input inputs/prediction.json  



---

## Model Integration

Supported formats:

- .pkl — classical ML models (RF, sklearn, etc.)  
- .pt — PyTorch models  

Models do not need to follow a specific class structure. Compatibility is handled through a wrapper layer in model_loader.py, which standardizes outputs.


## Summary

Pipeline:

Payload → Jobs → Model Loader → Model → Wrapper → Output
