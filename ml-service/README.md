# ML Service

FastAPI inference service for the DECO3801 Fungi Pattern Analysis project.

This service is intentionally separate from the Node.js backend. The Node backend owns API routing, MongoDB records, Redis/BullMQ jobs, and Supabase metadata resolution. This Python service only receives backend-prepared dataset and model URLs, loads the files temporarily, runs real model inference through pluggable adapters, and returns structured result payloads.

`sameple_time_voltage.csv` is provided for testing and usage sample dataset.

For backend setup and the full job flow, see [backend/README.md](../backend/README.md).

---

## Service Overview

```text
Node worker
  → resolves dataset metadata from MongoDB
  → resolves model metadata from MongoDB
  → generates Supabase signed URLs for both files
  → POST /ml/<task> to this service
      → downloads dataset + model via signed URLs
      → preprocesses the Time/Voltage signal
      → loads model via adapter (sklearn / torch)
      → runs inference
      → formats and returns structured result
  → worker stores result in MongoDB
```

The ML service does **not** create Workspace jobs, store results, or manage the job lifecycle. It only receives a prepared request and returns an inference result.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service liveness check |
| `POST` | `/ml/detect-patterns` | Run pattern detection |
| `POST` | `/ml/custom-exploration` | Run configurable exploration with optional time filtering |
| `POST` | `/ml/predict-future` | Forecast future voltage values |

API docs are available at `http://localhost:8001/docs` when the service is running.

---

## Environment Variables

Create `ml-service/.env`:

```env
APP_ENV=development
LOG_LEVEL=INFO
REQUEST_TIMEOUT_SECONDS=120

# MongoDB — used to resolve dataset_id / model_id to Supabase paths
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
MONGODB_DATABASE=fungipatternanalysis

# Supabase — used to generate signed download URLs
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

MongoDB and Supabase connections are only used when a request passes a `dataset_id` or `model_id` instead of a direct `file_url`. If `file_url` values are provided directly (e.g. in testing), these env vars are not required.

---

## Installation

```bash
cd ml-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

---

## Running Locally

```bash
cd ml-service
.venv\Scripts\activate       # Windows
# or: source .venv/bin/activate  (Mac/Linux)

uvicorn app.main:app --reload --port 8001
```

Service runs at `http://127.0.0.1:8001`. API docs at `http://127.0.0.1:8001/docs`.

---

## Running Tests

```bash
cd ml-service
python -m pytest
```

Tests cover adapter selection, preprocessing strategies, and response formatters.

---

## Request / Response Reference

All endpoints share a common dataset and preprocessing structure. Only the task-specific config and response fields differ.

### Common Fields

**Dataset reference:**
```json
{
  "dataset_id": "use this OR file_url, not both",
  "file_url": "https://supabase-signed-url-here",
  "source": "supabase",
  "columns": {
    "time": "Time",
    "voltage": "Voltage"
  }
}
```

**Preprocessing config:**
```json
{
  "mode": "raw",
  "normalize": true,
  "missing_value_strategy": "interpolate"
}
```

`missing_value_strategy` options: `interpolate`, `drop`, `forward_fill`, `zero_fill`

**Model reference:**
```json
{
  "model_id": "use this OR file_url, not both",
  "name": "pattern-detector-v1",
  "type": "pkl",
  "version": "v1",
  "file_url": "https://supabase-signed-url-here"
}
```

---

### POST /ml/detect-patterns

```json
{
  "job_id": "local-ml-test-001",
  "dataset": { ... },
  "preprocessing": { ... },
  "detection_config": {
    "pattern_types": ["spike", "oscillation"],
    "threshold": 0.5,
    "window_size": 20,
    "min_interval": 5
  },
  "model": { ... }
}
```

Response:

```json
{
  "job_id": "local-ml-test-001",
  "task": "detect_patterns",
  "detected_patterns": [
    {
      "pattern_id": "...",
      "type": "spike",
      "start_time": "...",
      "end_time": "...",
      "snapshot": {},
      "frequency": 1.0,
      "amplitude": 0.85,
      "interval": 0.0,
      "confidence_score": 0.75
    }
  ],
  "summary": {
    "recurrence": { "spike": 3 },
    "averages": { "frequency": 1.0, "amplitude": 0.85, "confidence_score": 0.75 }
  }
}
```

---

### POST /ml/custom-exploration

```json
{
  "job_id": "...",
  "dataset": { ... },
  "preprocessing": { ... },
  "analysis_config": {
    "threshold": 0.5,
    "window_size": 20,
    "time_range": { "start": 0, "end": 100 }
  },
  "model": { ... },
  "previous_run_id": null
}
```

Response includes: `run_id`, `config_used`, `patterns`, `summary`, and optional `comparison` if a previous run was supplied.

---

### POST /ml/predict-future

```json
{
  "job_id": "...",
  "dataset": { ... },
  "preprocessing": { ... },
  "prediction_config": {
    "prediction_window": 20
  },
  "model": { ... }
}
```

Response:

```json
{
  "predicted_voltage_window": [
    { "time": 101.2, "voltage": 0.42, "confidence_score": 0.92 }
  ],
  "model_used": "lstm-predictor-v1",
  "confidence_score": 0.92,
  "summary": {
    "start_time": 101.2,
    "end_time": 121.2,
    "min_predicted_voltage": 0.38,
    "max_predicted_voltage": 0.51,
    "average_predicted_voltage": 0.44,
    "average_confidence_score": 0.88
  }
}
```

---

## Model Adapter Contract

The service supports two adapter families:

| Format | Adapter | Loading method |
|---|---|---|
| `.pkl` / `.joblib` | `SklearnModelAdapter` | Tries joblib → cloudpickle → pickle → dill (fallback chain) |
| `.pt` / `.pth` | `TorchModelAdapter` | `torch.load(map_location="cpu")`, calls `.eval()` on `nn.Module` |

The loaded object must expose one of the following interfaces (checked in order):

1. `obj.run_inference(frame, config)` — preferred; receives the full `pd.DataFrame` and config dict
2. `obj.predict(frame)` — receives the `pd.DataFrame` only
3. `obj(frame)` — callable fallback

If the object does not satisfy any of these, the request fails with a clear `ModelAdapterError`. **The service never returns mock output** — incompatible models are rejected with an error, not silently faked.

### What the model receives

- `frame`: a `pd.DataFrame` with exactly two columns, `Time` and `Voltage`, after preprocessing
- `config`: the task-specific config dict from the request (e.g. `detection_config`, `analysis_config`, `prediction_config`)

### What the model must return

A dict that matches the expected output shape for the task. See each training script's wrapper class for the exact expected keys. The formatters in `app/services/formatters.py` normalise common key variations, but the structure must be recognisable.

---

## Inference Pipeline

For each request, the service runs these steps in order:

1. **Dataset resolution** — if `dataset_id` is provided, look up MongoDB for the `storage_path`, generate a Supabase signed URL; otherwise use `file_url` directly
2. **Dataset loading** — download CSV/XLSX, validate `Time` and `Voltage` columns, coerce to numeric
3. **Preprocessing** — handle missing values (interpolate/drop/fill), optional detrending, optional z-score normalization
4. **Time filtering** (custom exploration only) — filter rows to `time_range.start` → `time_range.end`
5. **Model resolution** — if `model_id` is provided, look up MongoDB for `storage_path`, generate a Supabase signed URL; otherwise use `file_url` directly
6. **Model loading** — download binary to cache, detect format, instantiate adapter, load object
7. **Inference** — call model via adapter contract (`run_inference` → `predict` → callable)
8. **Formatting** — normalise raw model output into the typed response DTO
9. **Return** — send structured JSON response to the Node worker

Files downloaded during steps 2 and 6 are cached atomically by URL hash under `TMP_DIR` (default `/tmp/ml-service`) to avoid redundant downloads within a session.

---

## `exported_models/` — Personal Workspace

The `exported_models/` folder is empty by default. It is a personal workspace folder — place your own trained or downloaded model files here for local testing before uploading to Supabase.

Files in this folder are **not** used by the service automatically. You must upload a model binary to Supabase and register it in MongoDB via the backend API (or manually) before the service can load it.

---

## Dummy Models for Testing

`train_dummy_models.py` is a standalone script that generates three minimal test models — `dummy_detect.pkl`, `dummy_custom.pkl`, `dummy_predict.pkl`. These models use simple heuristics (z-score thresholding, moving averages) and are **not suitable for production**. Their only purpose is to verify that the end-to-end pipeline (upload → job → worker → ML service → result) works correctly before real models are available.

```bash
# Run from the ml-service directory
python train_dummy_models.py --dataset sample_time_voltage.csv --out exported_models
```

This writes three `.pkl` files to `exported_models/`. Upload them via the backend:

```
POST http://127.0.0.1:5000/models/upload
```

See [backend/README.md](../backend/README.md) for full upload instructions. The dummy model names on Supabase are `dummy_detect`, `dummy_explore`, and `dummy_predict` — these already exist in the shared Supabase environment and can be reused.

---

## Pre-Built Training Scripts

Three sets of training scripts are provided by team members under `pre-built-training-scripts/`. Each produces real ML model artifacts that can be registered with the backend and used for production inference.

> **Before running any training script**, read the README inside that contributor's folder. Each README explains the training data required, the expected data format, the CLI flags, and what artifact files to upload.

---

### Hao's Models — RF, CNN, LSTM (scikit-learn)

**Folder:** [pre-built-training-scripts/hao_models/](pre-built-training-scripts/hao_models/)  
**README:** [pre-built-training-scripts/hao_models/README.md](pre-built-training-scripts/hao_models/README.md)

Three `.pkl` wrappers covering all three Workspace tasks:

| Artifact | Task | Algorithm | Accuracy |
|---|---|---|---|
| `rf_pattern_detection.pkl` | `detect_patterns` | Random Forest (100 trees) | 93% val / 87% test |
| `cnn_custom_exploration.pkl` | `custom_exploration` | MLP Classifier (CNN-style) | 84% val / 91% test |
| `lstm_predict_future.pkl` | `predict_future` | MLP Regressor (LSTM-style) | RMSE 0.009 (scaled) |

**Training data:** `provided-training-data.xlsx` (5615 rows × 4 ADC channels)

Each exported `.pkl` is a self-contained wrapper that bundles the trained model, scaler, label encoder, and all preprocessing logic. No separate config or scaler files are needed at inference time.

**To train:**

```bash
# Run from inside the hao_models/ folder
python training/train_rf_pattern_detection.py --input "provided-training-data.xlsx"
python training/train_cnn_custom_exploration.py --input "provided-training-data.xlsx"
python training/train_lstm_predict_future.py --input "provided-training-data.xlsx"
```

Artifacts are written to `outputs/models/`. Run the smoke test to verify compatibility before uploading:

```bash
python training/smoke_test_models.py --sample-input sample_time_voltage.csv
```

**For inference to work**, copy the training scripts into the `/ml-service` folder so the adapter can unpickle the wrapper classes at load time:

```bash
# Copy from hao_models/training/ into ml-service/
cp pre-built-training-scripts/hao_models/training/*.py .
```

This is required because cloudpickle serialises the wrapper class definition by reference. If the class is not importable at load time, unpickling will fail.

---

### Kanon's Models — K-Means, HMM, LSTM (hmmlearn + PyTorch)

**Folder:** [pre-built-training-scripts/kanon_models/](pre-built-training-scripts/kanon_models/)  
**README:** [pre-built-training-scripts/kanon_models/README.md](pre-built-training-scripts/kanon_models/README.md)

A pipeline using sliding-window feature extraction, K-Means clustering, Gaussian HMM, and PyTorch LSTM:

| Artifact | Purpose |
|---|---|
| `kmeans.pkl` | K-Means clustering (3 classes: spike, oscillation, baseline) |
| `hmm_model.pkl` | Gaussian HMM for temporal state transitions |
| `scaler.pkl` | StandardScaler fitted on extracted features |
| `lstm_model.pth` | PyTorch LSTM for sequential pattern prediction |
| `config.pkl` | LSTM architecture config (seq_len, hidden size, feature names) |

**Training steps:** See the README in the kanon_models folder for the full pipeline. Scripts: `DataPreparation.py`, `Data_cleaning.py`, `PatternDetection.py`, `PredictionModel.py`, `Customised.py`, `trainHMM.py`.

**For inference to work**, copy the relevant training scripts into the `/ml-service` folder so classes can be unpickled correctly.

---

### Lucky's Models — PyTorch K-Means / HMM / LSTM

**Folder:** [pre-built-training-scripts/lucky_models/](pre-built-training-scripts/lucky_models/)  
**README:** [pre-built-training-scripts/lucky_models/README.md](pre-built-training-scripts/lucky_models/README.md)

A PyTorch-based pipeline with K-Means clustering, Gaussian HMM, and LSTM for temporal pattern prediction.

| Artifact | Purpose |
|---|---|
| `kmeans.pkl` | K-Means over spike/statistical/FFT features (4 clusters: baseline, active, oscillation, burst) |
| `hmm_model.pkl` | Gaussian HMM over 4 hidden biological states |
| `scaler.pkl` | StandardScaler for feature normalisation |
| `config.pkl` | LSTM architecture config (seq_len, input features, hidden size) |
| `lstm_model.pth` | PyTorch LSTM weights for sequential pattern prediction |

**For inference to work**, copy the relevant training scripts into the `/ml-service` folder so classes can be unpickled correctly. See the README in the lucky_models folder for full training instructions.

---

## Getting Models Into the System

### Standard path — upload via backend API

After training, upload each model binary using the backend API:

```
POST http://127.0.0.1:5000/models/upload
```

Body → `form-data`:

```
file        → your_model.pkl / your_model.pth
name        → pattern-detector-v1
type        → pkl   (or: joblib / pt / pth)
version     → v1
task_type   → detect_patterns   (or: custom_exploration / predict_future)
```

The backend uploads the binary to Supabase `models` bucket and creates the MongoDB metadata document automatically. See [backend/README.md](../backend/README.md) for the full model upload walkthrough.

---

### Large model path — manual Supabase upload + MongoDB document

If a model file is too large to upload through the backend API (Render has request size limits), upload the binary directly via the Supabase Storage UI, then create the MongoDB document manually in MongoDB Atlas.

**Step 1 — Upload to Supabase Storage:**

Upload the binary to the `models` bucket. Note the full storage path (e.g. `models/your_model.pth`).

**Step 2 — Get the public or signed URL:**

From Supabase Storage, copy the file URL. For private buckets, you will need a signed URL or the signed URL generation will happen at job time via the worker.

**Step 3 — Create the MongoDB document manually:**

In MongoDB Atlas, open your database, select the `modelmetadatas` collection, and insert a document matching this schema:

```json
{
  "name": "your-model-name",
  "type": "pth",
  "version": "v1",
  "task_type": "predict_future",
  "file_url": "https://your-project.supabase.co/storage/v1/object/public/models/your_model.pth",
  "storage_path": "your_model.pth",
  "bucket": "models",
  "metadata": {},
  "created_at": { "$date": "2026-05-21T00:00:00.000Z" },
  "updated_at": { "$date": "2026-05-21T00:00:00.000Z" }
}
```

Required fields: `name`, `type`, `task_type`, `file_url`, `storage_path`, `bucket`.  
Optional fields: `selection`, `version`, `metadata`.

After inserting, copy the `_id` of the new document. This is the `model_id` you pass in Workspace job payloads.

---

## Directory Structure

```
ml-service/
├── app/
│   ├── main.py                          # FastAPI app entry point
│   ├── core.py                          # Settings from env vars / .env
│   ├── adapters/
│   │   ├── base.py                      # Abstract adapter + call_model() fallback chain
│   │   ├── registry.py                  # Selects adapter by file extension
│   │   ├── sklearn_adapter.py           # joblib/cloudpickle/pickle loader chain
│   │   └── torch_adapter.py             # torch.load() with eval() call
│   ├── api/routes/
│   │   ├── detect_patterns.py           # POST /ml/detect-patterns
│   │   ├── custom_exploration.py        # POST /ml/custom-exploration
│   │   └── predict_future.py            # POST /ml/predict-future
│   ├── dto/
│   │   └── schemas.py                   # All Pydantic request/response schemas
│   └── services/
│       ├── inference.py                 # Orchestrates the full inference pipeline
│       ├── dataset_loader.py            # CSV/XLSX loading and column validation
│       ├── model_loader.py              # Model resolution and adapter instantiation
│       ├── preprocessing.py             # Missing value handling, detrending, normalization
│       ├── formatters.py                # Converts raw model output to response DTOs
│       ├── file_cache.py                # Atomic download and caching by URL hash
│       ├── mongo_resolver.py            # Resolves dataset_id / model_id via MongoDB
│       └── supabase_storage.py          # Generates Supabase signed URLs
├── tests/
│   ├── test_adapter_selection.py
│   ├── test_preprocessing.py
│   └── test_formatters.py
├── pre-built-training-scripts/
│   ├── hao_models/                      # RF, CNN, LSTM — scikit-learn wrappers
│   ├── kanon_models/                    # K-Means, HMM, LSTM — hmmlearn + PyTorch
│   └── lucky_models/                    # K-Means, HMM, LSTM — PyTorch
├── exported_models/                     # Personal workspace — empty by default
├── train_dummy_models.py                # Generates dummy .pkl models for pipeline testing
├── sample_time_voltage.csv              # Single-channel sample dataset for testing
└── requirements.txt
```

---

## Dependencies

```
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
pydantic-settings>=2.2.1
pandas>=2.2.0
numpy>=1.26.0
openpyxl>=3.1.2
httpx>=0.27.0
joblib>=1.4.0
scikit-learn>=1.4.0
pytest>=8.2.0
pytest-asyncio>=0.23.0
cloudpickle>=2.2.0
motor>=3.4.0
pymongo>=4.7.0
```

PyTorch (`torch`) is **not** in `requirements.txt` because it is large and installation varies by platform and CUDA version. If you use `.pt` or `.pth` model files, install it separately:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

