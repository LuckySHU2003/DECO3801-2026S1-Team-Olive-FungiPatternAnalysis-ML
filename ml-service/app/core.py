from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    log_level: str = "INFO"
    request_timeout_seconds: int = 120
    tmp_dir: str = "/tmp/ml-service"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
