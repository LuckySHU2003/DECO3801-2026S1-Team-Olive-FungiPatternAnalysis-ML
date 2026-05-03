# AI Web System Backend Starter

This starter is a production-structured but minimal backend foundation for an AI web-based system that supports dataset upload, dataset listing, prediction jobs, result fetching, and chat-based insight stubs.

The design follows this flow:

1. User uploads dataset from internal_dev_fe.
2. Backend uploads the file to Supabase Storage.
3. Backend stores dataset metadata in MongoDB Atlas.
4. User triggers prediction.
5. API creates a MongoDB job with pending status.
6. API pushes a BullMQ job to Redis.
7. Node worker processes the job.
8. Worker calls the Python ML service if ML_SERVICE_URL is configured.
9. Worker stores result in MongoDB.
10. Worker updates job status to completed.
11. Frontend polls job status and fetches result by result_id.

MongoDB stores metadata only. Files, datasets, and model binaries are not stored in MongoDB.

## Folder Structure

```text
ai_backend_starter/
  backend/
    src/
      api/
        app.ts
        routes/
          chat.routes.ts
          dataset.routes.ts
          job.routes.ts
          predict.routes.ts
          result.routes.ts
      config/
        db.ts
        env.ts
        supabase.ts
      dto/
        chat.dto.ts
        dataset.dto.ts
        job.dto.ts
        predict.dto.ts
        result.dto.ts
      models/
        Dataset.ts
        Job.ts
        Model.ts
        Result.ts
      queue/
        connection.ts
        job.queue.ts
      services/
        ChatService.ts
        DatasetService.ts
        InferenceService.ts
        JobService.ts
        ResultService.ts
      utils/
        logger.ts
      workers/
        job.worker.ts
    package.json
    tsconfig.json
    .env.example
  internal_dev_fe/
    index.html
    app.js
    README.md
  ml-service/
    app/
      main.py
      routes/
        predict.py
      services/
        predict_service.py
    requirements.txt
    README.md
  docker-compose.yml
```

## Main API Endpoints

```text
GET  /health
POST /datasets/upload
GET  /datasets
GET  /datasets/:id
POST /predict/:datasetId
GET  /jobs/:jobId
GET  /results/:resultId
POST /chat
```

Controllers are intentionally thin. They only validate request/response handling and call services. Business logic is placed in services and worker code.

## MongoDB Collections

```text
datasets
  id
  name
  file_url
  schema
  created_at

jobs
  id
  type
  dataset_id
  status
  created_at
  result_id

results
  id
  job_id
  output
  summary
  created_at

models
  id
  type
  version
  file_url
  metadata
```

## Supabase Storage Buckets

Create these buckets in Supabase:

```text
datasets
models
```

For this starter, the dataset upload flow uses public URLs from Supabase Storage. For a stricter production setup, switch this to signed URLs and private buckets.

## Local Setup

### 1. Start Redis

```bash
docker compose up -d redis
```

### 2. Configure Backend Env

```bash
cd backend
cp .env.example .env
```

Update `.env`:

```text
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATASETS_BUCKET=datasets
SUPABASE_MODELS_BUCKET=models
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=*
```

Use the Supabase service role key only on the backend. Do not expose it in the frontend.

### 3. Run Backend API

```bash
cd backend
npm install
npm run dev
```

Backend runs at:

```text
http://localhost:4000
```

### 4. Run Backend Worker

Open a second terminal:

```bash
cd backend
npm run worker:dev
```

The worker listens to BullMQ jobs from Redis.

### 5. Run Python ML Service

Open a third terminal:

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On Windows PowerShell:

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

ML service runs at:

```text
http://localhost:8000
```

### 6. Run Internal Dev Frontend

Open a fourth terminal:

```bash
cd internal_dev_fe
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Testing the Pipeline

1. Open internal_dev_fe in the browser.
2. Upload a dataset file.
3. Click Load Datasets.
4. Click Predict on a dataset.
5. The frontend receives job_id immediately.
6. The frontend polls GET /jobs/:jobId.
7. When completed, it fetches GET /results/:resultId.
8. The mock result is displayed.

## DTO Layer

DTOs are lightweight and tailored to this project:

```text
DatasetUploadDTO
DatasetResponseDTO
PredictRequestDTO
MLWorkerPredictPayloadDTO
JobResponseDTO
ResultDTO
ChatRequestDTO
ChatResponseDTO
```

They define request/response shape between controllers, services, and workers. They do not handle file storage logic.

## Current Mock Areas

The following parts are intentionally stubbed:

```text
Prediction output
Plot job type
Chat/LLM integration
Model selection logic
Dataset schema extraction
Real ML model execution
```
