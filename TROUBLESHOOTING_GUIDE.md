# Troubleshooting Guide

This guide documents the common issues that can appear when running or testing the DECO3801 Fungi Pattern Analysis platform. It is written for developers, testers, and maintainers who need to diagnose deployment, storage, ML-service, and AI interpretation problems.

The project uses a deployed frontend, a Node backend, a FastAPI ML service, MongoDB, Redis/BullMQ, Supabase Storage, and OpenRouter-based AI interpretation features. Several parts of the system may rely on free-tier services, so some failures are caused by service limits rather than code defects.

---

## 1. Supabase or MongoDB blocks access to models and datasets

### Symptom

The application fails to load datasets or model files. The backend or ML service may fail when trying to download a dataset or model from Supabase Storage. You may see errors such as:

```text
Bucket not found
Object not found
Access denied
Failed to download model
Failed to fetch dataset
403 Forbidden
401 Unauthorized
```

MongoDB-related failures may appear as connection timeout, authentication failure, or cluster access rejection.

### Likely cause

Supabase buckets for datasets and models may be private, and the generated signed URL may be missing, expired, incorrectly created, or blocked by bucket policy. MongoDB Atlas may also block the backend if the current IP address or deployed service is not allowed in Network Access.

### Temporary testing fix

For temporary development and demo testing, you can make the relevant Supabase buckets public. This is not recommended for production, but it can reduce permission issues while testing the pipeline.

Typical buckets include:

```text
datasets
models
```

In Supabase:

1. Open the Supabase project dashboard.
2. Go to Storage.
3. Open the `datasets` bucket.
4. Check bucket settings.
5. Turn public access on if this is only for temporary testing.
6. Repeat for the `models` bucket.

After making the bucket public, test whether the file URL can be opened directly in the browser.

### MongoDB checklist

In MongoDB Atlas:

1. Open the cluster.
2. Go to Network Access.
3. Add your current IP address, or temporarily allow access from anywhere during development.
4. Check Database Access and confirm the username/password are correct.
5. Confirm the deployed backend has the correct `MONGODB_URI` environment variable.

Example environment variable:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
```

### Recommended long-term fix

For production, avoid making buckets public. Use signed URLs from the backend and keep bucket policies private. Public buckets are acceptable for short demo testing only when the stored data is not sensitive.

---

## 2. ML Payload 502 error

### Symptom

The browser console shows a `502` error when sending or processing an ML payload. The frontend may fail after pressing Run Analysis, or the result may never return.

Example browser console error:

```text
502 Bad Gateway
ML payload failed
Failed to fetch job result
```

### Likely cause

This project may use a free Redis database for BullMQ job queuing. Free Redis plans have limited storage, connection, and throughput. When the queue or payload data fills up too frequently, the backend or worker may fail to process jobs correctly.

The issue may not be from the ML model itself. It may be caused by Redis reaching its memory or usage limit.

### What to check first

Check Redis before debugging the model code.

1. Open your Redis provider dashboard.
2. Check memory usage.
3. Check connection count.
4. Check whether the database has reached the free-tier limit.
5. Check whether old jobs are filling the queue.
6. Confirm that the backend and worker are both using the same Redis connection string.

Example environment variable:

```env
REDIS_URL=redis://default:<password>@<host>:<port>
```

### Quick fix

If Redis is full or unstable, create a new Redis database and replace the Redis connection URL in the backend and worker environment variables.

After updating the Redis URL:

1. Restart the backend service.
2. Restart the worker service.
3. Run a small test dataset first.
4. Check whether the job reaches `completed` status.

### Useful test flow

Submit an analysis job, then check the job status:

```http
POST /workspace/jobs/detect-patterns
GET /jobs/<jobId>
GET /results/<resultId>
```

Only fetch the result after the job status is `completed`.

---

## 3. 429 error or strange Generate Interpretation result

### Symptom

The AI interpretation feature fails or returns inconsistent output. The browser console or backend may show:

```text
429 Too Many Requests
Provider returned error
Rate limit exceeded
```

The generated interpretation may also look weak, generic, incomplete, or unrelated to the result.

### Likely cause

The project assumes the use of free or small open-source models through OpenRouter. These models often have rate limits, limited context windows, weaker reasoning quality, or temporary availability issues.

This is usually not a frontend bug. It is often caused by the AI provider rejecting or throttling the request.

### Quick fix

Wait for a short period and retry.

Recommended retry time:

```text
30 to 60 seconds
```

If the issue continues, try:

1. Reducing the size of the result summary sent to the AI.
2. Waiting longer before retrying.
3. Switching to another OpenRouter model.
4. Using a paid API key or higher-limit model.
5. Checking whether the OpenRouter API key is correctly configured.

Example environment variable:

```env
OPENROUTER_API_KEY=<your-api-key>
```

### Practical note

Free AI models are suitable for demo interpretation, but they should not be treated as a fully reliable analysis layer. The core ML results should come from the ML service. The AI interpretation should be treated as a supporting explanation layer.

---

## 4. Chat Generate Interpretation reaches rate limit or returns inconsistent responses

### Symptom

The chat-based interpretation feature works sometimes, but fails after a few requests. It may also produce different interpretations for the same result.

Example issues:

```text
429 Provider returned error
Empty interpretation
Different answer after retry
Response unrelated to current result
```

### Likely cause

The chat interpretation feature depends on an external LLM provider. If the project uses free OpenRouter models, the response quality and request availability may vary.

### How to handle it

If the chat interpretation fails:

1. Wait 30 to 60 seconds.
2. Retry the request.
3. Avoid repeatedly clicking the button.
4. Check the browser console for a `429` or provider error.
5. Check backend logs to confirm whether the request reached the AI route.

### Recommended improvement

To reduce repeated rate-limit errors, the frontend can disable the Generate Interpretation button while a request is loading. The backend can also cache the latest interpretation for the same result ID.

This is optional and not required for basic testing.

---

## 5. Upload Model POST request takes too long

### Symptom

Uploading a model through the backend takes too long, times out, or fails. This is more likely when the model file is large.

Possible errors:

```text
Request timeout
Payload too large
Upload failed
502 Bad Gateway
504 Gateway Timeout
```

### Likely cause

Large model files are not always suitable for normal backend POST upload flows, especially when deployed on free-tier services. The request may exceed file size, timeout, or memory limits.

### Temporary workaround

Upload the model manually to Supabase Storage, then create or update the corresponding model metadata document manually in the database.

Manual Supabase upload steps:

1. Open Supabase dashboard.
2. Go to Storage.
3. Open the `models` bucket.
4. Upload the model file manually.
5. Copy the file path or public URL, depending on your storage setup.

Then create a model metadata document in MongoDB that points to the uploaded file.

Example model document structure:

```json
{
  "name": "rf_pattern_detection_model",
  "task_type": "detect_patterns",
  "storage_bucket": "models",
  "storage_path": "rf/rf_pattern_detection_model.pkl",
  "file_type": "pkl",
  "status": "active",
  "created_at": "2026-05-21T00:00:00.000Z"
}
```

Adjust the field names to match the actual backend schema.

### What to verify

After manual upload:

1. Confirm the file exists in Supabase.
2. Confirm the MongoDB document points to the correct path.
3. Confirm the backend can create a signed URL for the model.
4. Confirm the ML service can download and load the model.

---

## 6. ML training files must be copied into the ML service layer

### Symptom

The ML service cannot find training scripts, model wrapper code, adapters, preprocessing utilities, or formatter logic. A model may work in the training folder but fail inside the deployed ML service.

Possible errors:

```text
ModuleNotFoundError
ImportError
FileNotFoundError
Cannot load model
Missing formatter
Missing preprocessing function
```

### Required setup

For the ML service to work correctly, copy all necessary training and wrapper files from the corresponding folder inside:

```text
pre-built-training-script
```

into the correct layer of:

```text
/ml-service
```

The ML service should contain the files needed to:

1. Load the model artifact.
2. Recreate preprocessing steps.
3. Format input data.
4. Run inference.
5. Format the output payload expected by the backend/frontend.

### Example

If the Random Forest training folder contains:

```text
train_rf.py
rf_wrapper.py
formatters.py
preprocessing.py
```

then the ML service must also have the relevant runtime files, such as:

```text
ml-service/app/adapters/rf_wrapper.py
ml-service/app/utils/formatters.py
ml-service/app/utils/preprocessing.py
```

You do not always need the actual training script in production, but you do need every file required by the exported model during inference.

### Common mistake

A model may load successfully in the training folder because local imports exist there, but fail in the ML service because those helper files were not copied across.

---

## 7. Model loader only loads one model artifact

### Symptom

A model works locally during training but fails after upload to Supabase. This often happens when the model depends on multiple files.

Example multi-file model dependencies:

```text
model.pkl
scaler.pkl
label_encoder.pkl
feature_config.json
preprocessing_pipeline.pkl
```

### Likely cause

The backend model loader is designed to load one model artifact from Supabase. If your model requires multiple separate artifacts, the ML service may only receive the main `.pkl` file and miss the scaler, encoder, or feature pipeline.

### Recommended fix

Bundle all required model components into one `.pkl` artifact before uploading to Supabase.

Example Python bundle:

```python
import pickle

bundle = {
    "model": model,
    "scaler": scaler,
    "label_encoder": label_encoder,
    "feature_columns": feature_columns,
    "metadata": {
        "task_type": "detect_patterns",
        "version": "1.0.0"
    }
}

with open("bundled_model.pkl", "wb") as f:
    pickle.dump(bundle, f)
```

Then the ML service can load one file and access everything from the bundle:

```python
with open("bundled_model.pkl", "rb") as f:
    bundle = pickle.load(f)

model = bundle["model"]
scaler = bundle["scaler"]
feature_columns = bundle["feature_columns"]
```

### Why this matters

This avoids broken inference caused by missing secondary artifacts. It also keeps Supabase model storage simpler because each model entry maps to one artifact.

---

## 8. Service crashes because `dist/` is outdated or incompatible

### Symptom

The backend runs from `dist/`, but recent source code changes are not reflected when the service starts. The app may crash or behave like an older version.

Possible errors:

```text
Cannot find module dist/server.js
Route not found
Old endpoint still running
New code not reflected
Unexpected runtime error after code changes
```

### Likely cause

The Node backend is built from TypeScript or source files into the `dist/` folder. If you edit source files but do not rebuild, the running service may still use old compiled files.

Another common cause is an old Node process still running in the background.

### Local Windows fix

Stop existing Node processes:

```powershell
taskkill /F /IM node.exe
```

Then rebuild and restart:

```powershell
npm run build
npm start
```

Or, if using yarn:

```powershell
yarn build
yarn start
```

### Local development alternative

If the project supports development mode, use the dev command instead of manually running `dist/`:

```powershell
npm run dev
```

This is better for active development because it avoids repeatedly rebuilding manually.

### Deployment checklist

For Render or other deployment services, confirm:

1. The build command runs successfully.
2. The start command points to the correct compiled file.
3. The deployed branch contains the latest source code.
4. Environment variables are set correctly.
5. The service was manually redeployed after major changes.

Example Render commands:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

Example `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts"
  }
}
```

If the service still behaves incorrectly after rebuild, delete the local `dist/` folder and rebuild from scratch:

```powershell
Remove-Item -Recurse -Force dist
npm run build
npm start
```

---

## General debugging checklist

When the application fails, debug in this order:

1. Check browser console errors.
2. Check backend logs.
3. Check worker logs.
4. Check ML service logs.
5. Check Redis usage and connection status.
6. Check MongoDB cluster access.
7. Check Supabase bucket visibility and file paths.
8. Check whether the job status is `completed` before fetching results.
9. Check whether model artifacts can be downloaded and loaded.
10. Check whether the deployed service has been rebuilt after source changes.

A useful quick health check is:

```http
GET /health
```

If `/health` works but ML jobs fail, the issue is likely in the queue, worker, ML service, model artifact, or storage access rather than the basic backend server.

---

## Common environment variables to verify

Check that these are set correctly in local `.env` files and deployment dashboards:

```env
MONGODB_URI=
REDIS_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
ML_SERVICE_URL=
CORS_ORIGIN=
PORT=
```

For the frontend, check:

```env
VITE_API_URL=
```

If the frontend is deployed on Vercel and the backend is deployed on Render, `VITE_API_URL` should point to the deployed backend URL, not localhost.

---

## Final notes

Many issues in this project are caused by external service limits rather than broken business logic. Free-tier Redis, OpenRouter, Render, MongoDB, and Supabase settings can all affect reliability.

For demos, temporary public buckets and fresh Redis instances may help. For production, the project should use private buckets, stable signed URL generation, proper Redis cleanup, stronger model hosting, and higher-rate AI provider access.
