from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://operator:operator@localhost:5432/darkstore"
    APP_NAME: str = "Outpost"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
