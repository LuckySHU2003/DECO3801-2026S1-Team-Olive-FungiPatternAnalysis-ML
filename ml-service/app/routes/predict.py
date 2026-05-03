from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any
from app.services.predict_service import mock_predict

router = APIRouter()

class PredictRequest(BaseModel):
    dataset_url: str
    model_url: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)

@router.post("/predict")
def predict(request: PredictRequest):
    return mock_predict(request.dataset_url, request.model_url, request.parameters)
