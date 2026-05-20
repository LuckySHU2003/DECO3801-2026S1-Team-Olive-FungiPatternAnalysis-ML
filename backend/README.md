# Backend Guide

This backend powers the Workspace workflow for the FungiPatternAnalysis project. It handles Time/Voltage dataset uploads, asynchronous ML analysis jobs, result storage, and result delivery to the frontend.

The three supported Workspace analysis functions are:

- **Detect patterns** — identifies spikes, oscillations, and recurring signal patterns
- **Custom exploration** — configurable analysis over a user-defined time range
- **Predict future behaviour** — forecasts voltage values over a prediction window

> Correlation is intentionally excluded from the Workspace.

`sameple_time_voltage.csv` is provided for testing and usage sample dataset.\
For ML service internals, see [/ml-service/README.md](../ml-service/README.md).

---

## API Documentation

API for backend can be available on starting server at: `http://localhost:5000/docs`

---

## Tech Stack

The backend worker resolves real dataset and model metadata from MongoDB, generates Supabase signed URLs, and sends them to the Python FastAPI `ml-service`. The ML service performs real model inference and returns the result, which the worker stores in MongoDB.

| Service | Role |
|---|---|
| **MongoDB Atlas** | Stores dataset metadata, model metadata, job records, and result documents |
| **Redis Cloud** | Stores the BullMQ job queue — pending jobs, queue state, worker dispatch |
| **Supabase Storage** | Stores the actual files — uploaded datasets and model binaries |
| **Render** | Hosts and runs the backend API, backend worker, and Python ML service |

### What MongoDB stores

- `datasets` — metadata for uploaded CSV/XLSX files
- `models` — metadata for uploaded ML model binaries
- `jobs` — job status records for all Workspace tasks
- `results` — inference result documents returned by the ML service

MongoDB does **not** store actual file contents. File binaries live in Supabase Storage.

### What Supabase stores

- `datasets` bucket — uploaded CSV/XLSX dataset files
- `models` bucket — model binaries (`.pkl`, `.joblib`, `.pt`, `.pth`, and other Python-compatible formats)

### What Redis stores

- Pending Workspace job payloads
- BullMQ queue state
- Worker task dispatch signals

---

## Architecture — Full Request Flow

```text
Frontend / Postman
  → backend API (Fastify, port 5000)
      → MongoDB Atlas: create job record (status: pending)
      → Redis Cloud: push job to BullMQ queue
  → backend worker (BullMQ consumer)
      → MongoDB: resolve dataset metadata
      → MongoDB: resolve model metadata
      → Supabase: generate signed URL for dataset file
      → Supabase: generate signed URL for model file
      → Python ML service (FastAPI, port 8001)
          → downloads files from signed URLs
          → loads model, runs inference
          → returns structured result payload
      → MongoDB: store result document
      → MongoDB: update job status to completed
  → Frontend polls GET /jobs/:jobId
  → Frontend fetches GET /results/:resultId
  → Frontend renders output
```

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

NODE_ENV=development

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
REDIS_URL=redis://default:<password>@<hostname>:<port>

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATASETS_BUCKET=datasets
SUPABASE_MODELS_BUCKET=models
SUPABASE_SIGNED_URL_EXPIRES_SECONDS=3600

ML_SERVICE_URL=http://localhost:8001
ML_REQUEST_TIMEOUT_MS=120000

OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

For production on Render, replace localhost URLs with your deployed service URLs:

```env
CORS_ORIGIN=https://your-frontend.vercel.app
ML_SERVICE_URL=https://your-ml-service.onrender.com
```

---

## Supabase Setup

Create two Storage buckets in your Supabase project:

```text
datasets
models
```

- `datasets` — receives uploaded CSV/XLSX files via `POST /datasets/upload`
- `models` — receives uploaded model binaries via `POST /models/upload`

The backend stores only metadata and file paths in MongoDB. File contents live exclusively in Supabase. The worker uses the stored `storage_path` to generate signed URLs at job processing time.

---

## Redis Setup

Redis is used by BullMQ as the queue backend. For Redis Cloud, your connection string is:

```env
REDIS_URL=redis://default:<password>@<host>:<port>
```

If TLS is required:

```env
REDIS_URL=rediss://default:<password>@<host>:<port>
```

If you see this warning:

```text
IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"
```

The system still functions for development and MVP testing, but production BullMQ usage requires `noeviction`.

---

## Installation

Install backend dependencies:

```bash
cd backend
npm install
```

Install ML service dependencies:

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

Start all three services in separate terminals.


**Terminal 1 — Backend API:**

```bash
cd backend
npm run start:all
```
This start 2 services on the same terminal.
Expected output:

```text
API listening on port 5000
MongoDB connection exists
Workspace worker started
```
Or alternatively separate 2 backend terminals:
```bash
cd backend
npm run dev
```
```bash
cd backend
npm run worker:dev
```
See package.json for running commands detailed.


**Terminal 3 — Python ML Service:**

```bash
cd ml-service
.venv\Scripts\activate        # Windows
# or: source .venv/bin/activate  (Mac/Linux)
uvicorn app.main:app --reload --port 8001
```

Service addresses:

```text
Backend API:  http://127.0.0.1:5000
ML service:   http://127.0.0.1:8001
ML API docs:  http://127.0.0.1:8001/docs
```

---

## Running Tests

Run backend unit tests:

```bash
cd backend
npm run test
npm run build
```

Run ML service tests:

```bash
cd ml-service
python -m pytest
```

Backend tests cover DTO validation, dataset service behaviour, Workspace job creation, job status transitions, result storage, and route response shapes. External services (MongoDB, Redis, Supabase, ML service) are mocked in unit tests.

---

## Manual API Testing (Postman)

Use Postman to walk through the full v2.0 flow. All services must be running before starting.

### Step 1 — Test backend health

```
GET http://127.0.0.1:5000/health
```

Expected:

```json
{ "ok": true }
```

### Step 2 — Test ML service health

```
GET http://127.0.0.1:8001/health
```

Expected:

```json
{
  "ok": true,
  "service": "ml-service"
}
```

Minor differences in the health payload are acceptable as long as the endpoint confirms the ML service is alive.

---

### Step 3 — Upload a dataset

> **Note:** Dummy test datasets (`dummy_detect`, `dummy_explore`, `dummy_predict`) already exist in Supabase. Reuse them to avoid duplicates. Upload only if you are running for the first time or need a fresh dataset.

```
POST http://127.0.0.1:5000/datasets/upload
```

Body → `form-data`:

```
Key: file    Type: File    Value: sample_time_voltage.csv
```

The CSV must contain at least a `Time` and `Voltage` column:

```csv
Time,Voltage
0,0.12
1,0.18
2,0.32
3,0.25
4,0.41
```

Test datasets must always follow the `[Time][Column]` format (CSV or XLSX).

Expected response:

```json
{
  "dataset_id": "someId",
  "name": "dummy_dataset_name.csv",
  "original_filename": "dummy_dataset_name.csv",
  "source": "supabase",
  "file_url": "...",
  "storage_path": "...",
  "schema": {},
  "created_at": "2026-05-10T15:29:25.251Z"
}
```

Copy the `dataset_id`. Verify in:

- **MongoDB Atlas** → `datasets` collection — new metadata document
- **Supabase Storage** → `datasets` bucket — uploaded file

### Step 4 — List datasets

```
GET http://127.0.0.1:5000/datasets
```

Expected: array of uploaded dataset metadata objects.

### Step 5 — Get one dataset

```
GET http://127.0.0.1:5000/datasets/<dataset_id>
```

Expected: single dataset metadata record.

---

### Step 6 — Upload a model file

In v2.0, do not use mock model metadata (e.g. `mock-rf-model`) for production-style testing. Upload a real Python-compatible model binary.

> Upload models one-by-one only.

The dummy models under `/ml-service/exported_models/` are trained by the standalone script `ml-service/train_dummy_models.py`. These are intentionally simple models used only to verify compatibility and deployment — not for accuracy.

```
POST http://127.0.0.1:5000/models/upload
```

Body → `form-data`:

```
Key: file        Type: File    Value: your_model.pkl / your_model.joblib / your_model.pt / your_model.pth
Key: name        Type: Text    Value: pattern-detector-v1
Key: type        Type: Text    Value: pkl
Key: version     Type: Text    Value: v1
Key: task_type   Type: Text    Value: detect_patterns   (or: custom_exploration / predict_future)
```

Expected response:

```json
{
  "model_id": "someId",
  "name": "pattern-detector-v1",
  "type": "pkl",
  "version": "v1",
  "task_type": "detect_patterns",
  "source": "supabase",
  "file_url": "...",
  "storage_path": "...",
  "bucket": "models",
  "metadata": {},
  "created_at": "2026-05-10T15:39:07.848Z"
}
```

Copy the `model_id`. Verify in:

- **MongoDB Atlas** → `models` collection — new metadata document
- **Supabase Storage** → `models` bucket — uploaded model binary

### Step 7 — List models

```
GET http://127.0.0.1:5000/models
```

Expected: array of uploaded model metadata objects.

### Step 8 — Get one model

```
GET http://127.0.0.1:5000/models/<model_id>
```

Expected: single model metadata record.

---

### Step 9 — Direct ML service test (optional diagnostic)

This step tests whether the ML service can independently download files, load a model, and return a correctly shaped inference response, **bypassing the backend worker**. Use this to isolate ML service issues.

You need a temporary signed URL for both the dataset and model files — generate these directly from the Supabase Storage UI. Do **not** use the registered `file_url` stored in MongoDB; those are permanent URLs, not signed URLs.

```
POST http://127.0.0.1:8001/ml/detect-patterns
```

Body → raw → JSON:

```json
{
  "job_id": "local-ml-test-001",
  "dataset": {
    "source": "supabase",
    "file_url": "PASTE_SIGNED_DATASET_URL_HERE",
    "columns": {
      "time": "Time",
      "voltage": "Voltage"
    }
  },
  "preprocessing": {
    "mode": "raw",
    "normalize": true,
    "missing_value_strategy": "interpolate"
  },
  "detection_config": {
    "pattern_types": ["spike", "oscillation"],
    "threshold": 0.5,
    "window_size": 20,
    "min_interval": 5
  },
  "model": {
    "name": "pattern-detector-v1",
    "type": "pkl",
    "version": "v1",
    "file_url": "PASTE_SIGNED_MODEL_URL_HERE"
  }
}
```

Expected response shape:

```json
{
  "job_id": "local-ml-test-001",
  "task": "detect_patterns",
  "detected_patterns": [
    {
      "pattern_id": "...",
      "type": "...",
      "start_time": "...",
      "end_time": "...",
      "snapshot": {},
      "frequency": 0,
      "amplitude": 0,
      "interval": 0,
      "confidence_score": 0.0
    }
  ],
  "summary": {
    "recurrence": {},
    "averages": {}
  }
}
```

The exact pattern values depend on the uploaded model. If the model format or output is incompatible, the ML service should return a clear error — this is expected and confirms it is correctly rejecting incompatible files rather than silently returning fake output.

---

### Step 10 — Submit a detect-patterns job (full backend workflow)

This runs the complete pipeline through the backend API → MongoDB → Redis → worker → ML service.

```
POST http://127.0.0.1:5000/workspace/jobs/detect-patterns
```

Body → raw → JSON:

```json
{
  "job": "detect_patterns",
  "dataset": {
    "dataset_id": "PASTE_DATASET_ID_HERE",
    "source": "supabase",
    "columns": {
      "time": "Time",
      "voltage": "Voltage"
    }
  },
  "preprocessing": {
    "mode": "raw",
    "normalize": true,
    "missing_value_strategy": "interpolate"
  },
  "detection_config": {
    "pattern_types": ["spike", "oscillation"],
    "threshold": 0.5,
    "window_size": 20,
    "min_interval": 5
  },
  "model": {
    "model_id": "PASTE_MODEL_ID_HERE",
    "name": "YOUR_MODEL_NAME",
    "type": "YOUR_MODEL_TYPE",
    "version": "YOUR_MODEL_VERSION"
  }
}
```

Expected immediate response:

```json
{
  "job_id": "...",
  "type": "detect_patterns",
  "status": "pending"
}
```

Copy the `job_id`.

**What happens behind the scenes:**

1. Backend validates the request DTO
2. Backend creates a MongoDB job record (`status: pending`)
3. Backend pushes the job to Redis/BullMQ
4. Worker consumes the job
5. Worker resolves dataset metadata from MongoDB
6. Worker resolves model metadata from MongoDB
7. Worker generates Supabase signed URLs for both the dataset and model files
8. Worker calls the Python FastAPI ML service
9. ML service downloads files via signed URLs, loads the model, runs inference, returns result
10. Worker stores the result document in MongoDB
11. Worker updates job status to `completed` with `result_id`

### Step 11 — Submit a custom-exploration job

```
POST http://127.0.0.1:5000/workspace/jobs/custom-exploration
```

Body → raw → JSON:

```json
{
  "job": "custom_exploration",
  "dataset": {
    "dataset_id": "PASTE_DATASET_ID_HERE",
    "source": "supabase",
    "columns": {
      "time": "Time",
      "voltage": "Voltage"
    }
  },
  "preprocessing": {
    "mode": "raw",
    "normalize": true,
    "missing_value_strategy": "interpolate"
  },
  "analysis_config": {
    "threshold": 0.5,
    "window_size": 20,
    "time_range": {
      "start": 0,
      "end": 100
    }
  },
  "model": {
    "model_id": "PASTE_MODEL_ID_HERE",
    "name": "YOUR_MODEL_NAME",
    "type": "YOUR_MODEL_TYPE",
    "version": "YOUR_MODEL_VERSION"
  },
  "previous_run_id": null
}
```

Expected result (after polling) should include: `run_id`, `config_used`, `patterns`, `summary`, and optionally `comparison` if `previous_run_id` was supplied.

### Step 12 — Submit a predict-future job

Use a model whose adapter output is compatible with future voltage prediction.

```
POST http://127.0.0.1:5000/workspace/jobs/predict-future
```

Body → raw → JSON:

```json
{
  "job": "predict_future",
  "dataset": {
    "dataset_id": "PASTE_DATASET_ID_HERE",
    "source": "supabase",
    "columns": {
      "time": "Time",
      "voltage": "Voltage"
    }
  },
  "preprocessing": {
    "mode": "raw",
    "normalize": true,
    "missing_value_strategy": "interpolate"
  },
  "prediction_config": {
    "prediction_window": 20
  },
  "model": {
    "model_id": "PASTE_MODEL_ID_HERE",
    "name": "YOUR_MODEL_NAME",
    "type": "YOUR_MODEL_TYPE",
    "version": "YOUR_MODEL_VERSION"
  }
}
```

Expected result (after polling) should include:

- `predicted_voltage_window`
- `model_used`
- `confidence_score`
- `summary.start_time`
- `summary.end_time`
- `summary.min_predicted_voltage`
- `summary.max_predicted_voltage`
- `summary.average_predicted_voltage`
- `summary.average_confidence_score`

---

### Step 13 — Poll job status

After submitting any Workspace job, poll until `status` becomes `completed`:

```
GET http://127.0.0.1:5000/jobs/<job_id>
```

Possible statuses:

```text
pending      Job is queued, waiting for the worker
processing   Worker is currently running the job
completed    Job finished successfully; result_id is available
failed       Job failed; check worker and ML service logs
```

Expected completed response:

```json
{
  "job_id": "...",
  "type": "detect_patterns",
  "status": "completed",
  "result_id": "...",
  "created_at": "..."
}
```

Copy the `result_id`.

If the status stays `pending`, check:

1. Is `npm run worker:dev` running?
2. Is `REDIS_URL` correct and Redis reachable?
3. Is the ML service running on port 8001?
4. Check the worker terminal for errors

### Step 14 — Fetch result

```
GET http://127.0.0.1:5000/results/<result_id>
```

Expected response contains real ML service output stored by the worker. This should not be mock-generated data. The result comes from the ML service inference response.

---

## Service Verification Checklist

### MongoDB works if

- `datasets` collection contains uploaded dataset metadata documents
- `models` collection contains uploaded model metadata documents
- `jobs` collection contains created detect/custom/predict job records
- `results` collection contains ML service output documents
- MongoDB does **not** contain actual file contents — only metadata, IDs, status fields, storage paths, and result documents

### Supabase works if

- `datasets` bucket contains the uploaded CSV/XLSX files
- `models` bucket contains the uploaded model binaries
- The backend worker can generate signed URLs from the stored `storage_path` values

If the ML service cannot download files, check:

1. Bucket name matches `SUPABASE_DATASETS_BUCKET` / `SUPABASE_MODELS_BUCKET` env vars
2. `storage_path` saved in MongoDB matches the actual Supabase path
3. Signed URL expiry — `SUPABASE_SIGNED_URL_EXPIRES_SECONDS` must be long enough for the ML job to complete
4. `SUPABASE_SERVICE_ROLE_KEY` is set and valid
5. File was actually uploaded successfully

### Redis/BullMQ works if

- A Workspace job initially returns `{ "status": "pending" }`
- The worker picks it up and updates it to `{ "status": "completed" }`

If jobs stay `pending`, Redis or the worker is the issue.

### ML service works if

1. `GET /health` returns `{ "ok": true, "service": "ml-service" }`
2. Direct ML endpoint test (Step 9) successfully reads dataset and model URLs and returns a valid shaped response
3. Backend job flow produces a non-mock result stored in MongoDB
4. ML service returns clear errors for incompatible model formats instead of silently producing fake output
5. Worker terminal logs show a successful HTTP call to the ML service

### Backend API works if

- `GET /health` returns `{ "ok": true }`
- All Postman requests return the expected response shapes

---

## Common Failure Cases

| Symptom | Likely Cause |
|---|---|
| **Missing dataset URL** | Worker did not resolve dataset metadata or failed to generate a signed URL |
| **Missing model URL** | Model was not uploaded, metadata is missing in MongoDB, or signed URL generation failed |
| **Invalid dataset columns** | Uploaded file does not contain `Time` and `Voltage` columns, or column names do not match exactly (case-sensitive) |
| **Unsupported model format** | Model file type is not supported by the current ML adapter layer |
| **Incompatible model output** | Model loaded successfully but its output shape does not match the expected format for the selected task |
| **Job stuck at `pending`** | Backend API created the job but the worker did not process it — check Redis connection and worker terminal. Free version potentially block request payloads |
| **Job `failed`** | Worker processed the job but ML service call or Supabase access failed — check both worker logs and ML service logs |


## Frontend Integration

In `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```


The frontend must **not** send local file paths to the backend. The correct flow is:

```text
Upload file → receive dataset_id
  → submit Workspace job payload with dataset_id and model_id
  → receive job_id
  → poll GET /jobs/:jobId until completed
  → receive result_id
  → fetch GET /results/:resultId
  → render output and summary
```

---

## Chat Endpoint

`POST /chat` is a placeholder in this version. The service is designed to use OpenAI ChatCompletion. If `OPENAI_API_KEY` is missing, it may return a stub response. Full implementation is planned for a future release.

---

## Final v2.0 Success Checklist

A complete v2.0 pass requires all of the following:

- [ ] Backend tests pass (`npm run test`)
- [ ] Backend build passes (`npm run build`)
- [ ] ML service tests pass (`python -m pytest`)
- [ ] Backend health endpoint responds `{ "ok": true }`
- [ ] ML service health endpoint responds `{ "ok": true, "service": "ml-service" }`
- [ ] Dataset upload succeeds — file in Supabase, metadata in MongoDB
- [ ] Model upload succeeds — binary in Supabase, metadata in MongoDB
- [ ] Detect-patterns job completes with real ML service output
- [ ] Custom-exploration job completes with real ML service output
- [ ] Predict-future job completes with compatible model
- [ ] Result fetched via `GET /results/:resultId` contains real inference data
- [ ] No production mock inference is used
