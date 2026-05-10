from app.adapters.registry import select_adapter
from app.dto.schemas import ModelRef
from app.services.file_cache import download_to_cache


async def load_model_adapter(model: ModelRef):
    local_path = await download_to_cache(str(model.file_url), suffix_hint=f".{model.type}")
    adapter = select_adapter(model.type, local_path, model.metadata)
    adapter.load()
    return adapter
