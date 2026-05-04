from fastapi import FastAPI
from app.routes.workspace import router as workspace_router

app = FastAPI(title="MycoSignal ML Service")

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(workspace_router)
