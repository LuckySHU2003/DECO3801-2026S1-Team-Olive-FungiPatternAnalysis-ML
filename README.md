# DECO3801: Fungal Bioelectric Signal Analysis Platform

## Overview

This project aims to develop a data-driven platform for analysing fungal bioelectric signals. The system is designed to support researchers in processing raw electrical recordings, extracting meaningful features, applying machine learning models, and interpreting results through visualisation and automated summaries.

Fungal electrical activity is characterised by low-amplitude, noisy, and irregular signals, which makes manual analysis difficult. This platform provides a structured pipeline to standardise data processing and enable reproducible analysis workflows.

The system is currently under development. Several components are functional at a prototype level, while others are still being implemented or refined.

---

## Objectives

- Provide a unified workflow for fungal signal analysis  
- Reduce manual preprocessing and analysis effort  
- Enable reproducible machine learning experiments  
- Support interpretation of complex signal patterns through visual and textual outputs  

---

## System Architecture

The platform follows a modular full-stack architecture consisting of:

### Frontend
- Web-based interface for dataset upload and analysis configuration  
- Visualisation of signals, extracted features, and model outputs  
- Display of generated textual interpretations  

### Backend
- API 
- ML Models
- Handles data ingestion, preprocessing, modelling, and result delivery  

### Data Processing Pipeline
- Signal cleaning and filtering  
- Feature extraction  
- Model execution  
- Result storage and retrieval  

### Storage
- MongoDB for datasets, features, model outputs, and experiment metadata  

---

## Machine Learning

Two modelling approaches are being explored:

### Classification
- Objective: detect spike events in signal windows  
- Model: To be decided 
- Rationale: interpretable and suitable for structured features  

### Sequence Prediction
- Objective: model temporal behaviour of signals  
- Model: LSTM (PyTorch)  
- Rationale: captures sequential dependencies  

### Evaluation Metrics
- Precision, Recall, F1-score  
- Mean Absolute Error (MAE)  
- Root Mean Squared Error (RMSE)  
- still to be decided

---

## AI-Assisted Interpretation

The system includes an experimental component that generates textual summaries of results using a language model. The goal is to support interpretation rather than replace analytical reasoning.

This component is not finalised and may change significantly.

---

## Workflow

1. User uploads dataset (CSV)  
2. Backend parses and stores data  
3. Preprocessing pipeline cleans and transforms signals  
4. Features are extracted from processed signals  
5. Machine learning models are executed  
6. Results are stored and returned to frontend  
7. Frontend displays visualisations and summaries  


## Team

Team Olive – DECO3801

- Gia Hao Vo  
- Febriani Patricia  
- Kanon Iizuka  
- Lucky Shu  
- Sihui Li  
- Zijun Lu  

---

## Setup (Preliminary)

To be made later

## Notes

This repository represents an ongoing development project.  
Functionality, architecture, and implementation details are subject to change as the system evolves.
