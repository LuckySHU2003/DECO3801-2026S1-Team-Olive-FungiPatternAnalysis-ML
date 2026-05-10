from fastapi import APIRouter

from app.dto.schemas import PredictFutureRequest
from app.services.inference import run_predict_future

router = APIRouter()


@router.post("/ml/predict-future")
async def route(request: PredictFutureRequest):
    return await run_predict_future(request)
