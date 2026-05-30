from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cpm:cpm_dev@db:5432/cpm_training"
    database_url_sync: str = "postgresql://cpm:cpm_dev@db:5432/cpm_training"
    secret_key: str = "dev-secret-change-in-production"

    model_config = {"env_file": ".env"}


settings = Settings()
