# Backend README v2.0

This backend supports the Workspace workflow for uploading Time/Voltage datasets, creating asynchronous analysis jobs, processing jobs through a worker, calling the ML service, and returning results to the frontend.

The backend is designed around three Workspace functions:

- Detect patterns
- Custom exploration
- Predict future behaviour

Correlation is intentionally excluded.

## For ML Features, see /ml-service README.md

## What this backend does

The backend receives requests from the frontend, stores uploaded datasets in Supabase Storage, stores metadata and job records in MongoDB Atlas, pushes long-running tasks into Redis/BullMQ, and lets a worker process those jobs asynchronously.

The normal flow is:

```text
Frontend uploads dataset
→ Backend uploads file to Supabase
→ Backend stores dataset metadata in MongoDB
→ Frontend creates a Workspace job
→ Backend stores job as pending in MongoDB
→ Backend pushes job into Redis/BullMQ
→ Worker consumes job
→ Worker calls Python ML service
→ ML service returns result payload
→ Worker stores result in MongoDB
→ Frontend polls job status
→ Frontend fetches result
```

## Required services

You need these services running or configured:

```text
MongoDB Atlas      Stores metadata, jobs, and results
Redis Cloud        Stores BullMQ queue jobs
Supabase Storage   Stores uploaded datasets and model binaries
Node backend       Runs API endpoints
Node worker        Processes queued jobs
Python ML service  Handles mock or real model inference
```

## Environment variables

Create `backend/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

NODE_ENV=development

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
REDIS_URL=redis://default:<password@<hostname>:<port>

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

For production, change the sameple connection to your service url call.

## Supabase setup

Create two Supabase Storage buckets:

```text
datasets
models
```

Use `datasets` for uploaded CSV/XLSX files.
Use `models` for model binaries such as `.pkl`, `.pt`, or other Python model files.

The backend stores only the file URL/path in MongoDB. It does not store file contents in MongoDB.

## Redis setup

Redis is used by BullMQ as the queue backend.

If using Redis Cloud, your connection string should look like:

```env
REDIS_URL=redis://default:<password>@<host>:<port>
```

If using TLS:

```env
REDIS_URL=rediss://default:<password>@<host>:<port>
```

If you see this warning:

```text
IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"
```

The system can still work for MVP testing, but Redis should ideally use `noeviction` for production BullMQ usage.

## Install dependencies

From the backend folder:

```bash
cd backend
npm install
```

For the ML service:

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On Mac/Linux, activate with:

```bash
source .venv/bin/activate
```

## Running locally

Open three terminals.

Terminal 1: backend API

```bash
cd backend
npm run dev
```

Expected:

```text
API listening on port 5000
MongoDB connection exists
```

Terminal 2: backend worker

```bash
cd backend
npm run worker:dev
```

Expected:

```text
MongoDB connection exists
Workspace worker started
```

Terminal 3: ML service

```bash
cd ml-service
uvicorn app.main:app --reload --port 8001
```

Check the ML docs:

```text
http://localhost:8001/docs
```

Check backend health:

```text
http://127.0.0.1:5000/health
```

Expected response:

```json
{
  "ok": true
}
```

## Testing with Postman

### 1. Upload dataset

Endpoint:

```text
POST http://127.0.0.1:5000/datasets/upload
```

Postman body:

```text
Body → form-data
Key: file
Type: File
Value: sample_time_voltage.csv
```

The dataset should contain two columns:

```text
Time, Voltage
```

Expected response:

```json
{
  "dataset_id": "string",
  "name": "string",
  "file_url": "string",
  "created_at": "string"
}
```

After this, check:

```text
MongoDB Atlas → datasets collection
Supabase → Storage → datasets bucket
```

You should see metadata in MongoDB and the actual uploaded file in Supabase.

### 2. List datasets

Endpoint:

```text
GET http://127.0.0.1:5000/datasets
```

Expected response:

```json
{
  "datasets": []
}
```

Use this to confirm uploaded datasets are available to the frontend.

### 3. Get one dataset

Endpoint:

```text
GET http://127.0.0.1:5000/datasets/<dataset_id>
```

Expected response contains metadata for one dataset.

## Workspace jobs

Workspace jobs are asynchronous. When the frontend creates a job, the backend immediately returns a `job_id`. The frontend should then poll the job endpoint until the job is completed.

The general frontend flow is:

```text
POST workspace job
→ receive job_id
→ poll GET /jobs/:jobId
→ when completed, get result_id
→ fetch GET /results/:resultId
```

## Detect patterns

Endpoint:

```text
POST http://127.0.0.1:5000/workspace/jobs/detect-patterns
```

Request body:

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
    "name": "mock-rf-model",
    "selection": "rf",
    "type": "pkl",
    "version": "v1"
  }
}
```

Expected immediate response:

```json
{
  "job_id": "string",
  "type": "detect_patterns",
  "status": "pending"
}
```

## Custom exploration

Endpoint:

```text
POST http://127.0.0.1:5000/workspace/jobs/custom-exploration
```

Request body:

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
      "end": 120
    },
    "model_selection": "rf",
    "compare_with_previous_run": false
  },
  "previous_run_id": null
}
```

Expected immediate response:

```json
{
  "job_id": "string",
  "type": "custom_exploration",
  "status": "pending"
}
```

If `compare_with_previous_run` is true, provide a valid previous result or run ID in `previous_run_id`.

## Predict future behaviour

Endpoint:

```text
POST http://127.0.0.1:5000/workspace/jobs/predict-future
```

Request body:

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
    "prediction_window": 20,
    "model_selection": "lstm"
  },
  "model": {
    "name": "mock-lstm-model",
    "selection": "lstm",
    "type": "pt",
    "version": "v1"
  }
}
```

Expected immediate response:

```json
{
  "job_id": "string",
  "type": "predict_future",
  "status": "pending"
}
```

## Polling job status

Endpoint:

```text
GET http://127.0.0.1:5000/jobs/<job_id>
```

Possible statuses:

```text
pending
processing
completed
failed
```

Expected completed response:

```json
{
  "job_id": "string",
  "type": "detect_patterns",
  "status": "completed",
  "result_id": "string",
  "created_at": "string"
}
```

If the status stays `pending`, check:

```text
1. Is npm run worker:dev running?
2. Is REDIS_URL correct?
3. Is ML_SERVICE_URL correct?
4. Is the ML service running on port 8001?
```

## Fetching result

Endpoint:

```text
GET http://127.0.0.1:5000/results/<result_id>
```

Expected response:

```json
{
  "result_id": "string",
  "job_id": "string",
  "type": "detect_patterns",
  "output": {},
  "summary": {},
  "created_at": "string"
}
```

The frontend can render the `output` and `summary` however it wants.

## Chat endpoint

Have the placeholder for this version. Feature to be develop soon in future.

The chat service is designed to use OpenAI ChatCompletion. If `OPENAI_API_KEY` is missing, the service may return a stub response depending on the implementation.

## How to know each service is working

MongoDB is working if:

```text
Uploaded datasets appear in datasets collection
Created jobs appear in jobs collection
Completed results appear in results collection
```

Redis is working if:

```text
A workspace job changes from pending to processing/completed
Worker logs show completed job messages
```

Supabase is working if:

```text
Uploaded files appear in the datasets bucket
MongoDB dataset metadata contains file_url/storage_path
```

ML service is working if:

```text
Workspace jobs complete successfully
Result output contains mock or real ML payload
```

Backend API is working if:

```text
GET /health returns { "ok": true }
Postman requests return expected responses
```

## Running tests

From `backend/`:

```bash
npm test
```

Tests are intended to cover:

```text
DTO validation
Dataset service behaviour
Workspace job creation
Job status updates
Result storage
Route response behaviour
```

For unit tests, external services such as MongoDB, Redis, Supabase, and ML service should be mocked where possible.

## Frontend integration

In the frontend `.env`:

```env
VITE_API_URL=http://localhost:5000
```

In production:

```env
VITE_API_URL=https://your-backend-api.onrender.com
```

Frontend should not send local file paths. It should upload the file once, receive `dataset_id`, and use that `dataset_id` in Workspace job payloads.

Correct frontend job flow:

```text
Upload file
→ store dataset_id
→ send workspace job payload with dataset_id
→ receive job_id
→ poll job status
→ receive result_id
→ fetch result
→ render output
```

## Render deployment notes

Deploy the system as separate Render services.

Backend API service:

```bash
npm install && npm run build && npm run start
```

Worker service:

```bash
npm install && npm run build && npm run worker
```

ML service:

```bash
pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Render environment variables should match local `.env`, but with production URLs:

```env
PORT=5000
CORS_ORIGIN=https://your-frontend.vercel.app
MONGODB_URI=...
REDIS_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DATASETS_BUCKET=datasets
SUPABASE_MODELS_BUCKET=models
ML_SERVICE_URL=https://your-ml-service.onrender.com
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

After deployment, update the frontend `VITE_API_URL` to point to the Render backend API.