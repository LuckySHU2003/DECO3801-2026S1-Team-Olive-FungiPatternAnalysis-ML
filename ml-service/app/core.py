from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    log_level: str = "INFO"
    request_timeout_seconds: int = 120
    tmp_dir: str = "/tmp/ml-service"

    # MongoDB — used by ML-service to resolve dataset_id / model_id
    mongodb_uri: Optional[str] = None
    mongodb_database: str = "fungipatternanalysis"
    datasets_collection: str = "datasets"
    models_collection: str = "modelmetadatas"

    # Supabase — used by ML-service to generate signed download URLs
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()