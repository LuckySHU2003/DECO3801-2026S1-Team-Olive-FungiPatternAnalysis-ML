from fastapi import APIRouter

from app.dto.schemas import CustomExplorationRequest
from app.services.inference import run_custom_exploration

router = APIRouter()


@router.post("/ml/custom-exploration")
async def route(request: CustomExplorationRequest):
    return await run_custom_exploration(request)
