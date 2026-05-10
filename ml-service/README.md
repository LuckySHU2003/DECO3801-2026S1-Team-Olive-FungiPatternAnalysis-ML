# ML Service

FastAPI inference service for the DECO3801 Fungi Pattern Analysis backend.

This service is intentionally separate from the Node.js backend. The Node backend owns API routing, MongoDB records, Redis/BullMQ jobs, and Supabase metadata resolution. This Python service only receives backend-prepared dataset/model URLs, loads the files temporarily, runs real model inference through adapters, and returns DTO-shaped outputs.

## Endpoints

- `GET /health`
- `POST /ml/detect-patterns`
- `POST /ml/custom-exploration`
- `POST /ml/predict-future`

## Local run

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Mac/Linux activation:

```bash
source .venv/bin/activate
```

## Cloud workflow

Frontend creates a Workspace job through the Node backend. The Node backend stores job metadata in MongoDB and pushes a BullMQ job to Redis. The Node worker resolves dataset metadata and model metadata from MongoDB, creates Supabase signed URLs for the dataset and model binary, and calls this ML service. This service downloads the dataset/model from those URLs, runs inference, formats the result, and returns it to the worker. The worker stores the result in MongoDB.

## Model storage

Model binaries live in the Supabase `models` bucket. MongoDB stores only metadata: name, type, version, selection, storage path, public URL if available, and optional metadata. The ML service does not connect to MongoDB or Supabase directly.

## Adapter contract

Supported production adapters:

- `.pkl` / `.joblib`: loaded with pickle/joblib. The loaded object must expose `run_inference(frame, config)`, `predict(frame)`, or be callable.
- `.pt` / `.pth`: loaded with `torch.load` if PyTorch is installed. `nn.Module` models receive a numeric tensor made from `Time` and `Voltage`; callable objects follow the same `run_inference/predict/callable` contract.

The service does not use mock inference in production code. If a model does not satisfy the adapter contract, the request fails with a clear error.

## Tests

```bash
pytest
```
