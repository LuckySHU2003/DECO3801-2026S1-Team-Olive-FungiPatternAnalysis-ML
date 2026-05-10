from fastapi import APIRouter

from app.dto.schemas import DetectPatternsRequest
from app.services.inference import run_detect_patterns

router = APIRouter()


@router.post("/ml/detect-patterns")
async def route(request: DetectPatternsRequest):
    return await run_detect_patterns(request)
