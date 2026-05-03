from fastapi import FastAPI
from app.routes.predict import router as predict_router

app = FastAPI(title="Project ML Service", version="0.1.0")

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(predict_router)
