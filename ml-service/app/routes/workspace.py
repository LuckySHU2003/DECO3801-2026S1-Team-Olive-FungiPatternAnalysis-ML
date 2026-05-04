from fastapi import APIRouter
from app.services.workspace_service import mock_detect_patterns, mock_custom_exploration, mock_predict_future

router = APIRouter(prefix="/ml", tags=["workspace"])

@router.post("/detect-patterns")
def detect_patterns(payload: dict):
    return mock_detect_patterns(payload)

@router.post("/custom-exploration")
def custom_exploration(payload: dict):
    return mock_custom_exploration(payload)

@router.post("/predict-future")
def predict_future(payload: dict):
    return mock_predict_future(payload)
