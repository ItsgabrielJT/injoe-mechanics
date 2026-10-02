from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    DATABASE_URL: str = "postgresql://gabrieltates:gabrieltates@localhost:5432/mecanicos_db"
    AUTOCARE_DATABASE_URL: str = "postgresql://gabrieltates:gabrieltates@localhost:5432/autocare_db"
    SECRET_KEY: str = "cambiar-esta-clave-en-produccion-injoe-mecanicos"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8003
    CORS_ORIGINS: str = "http://localhost:3003,http://127.0.0.1:3003"
    APP_NAME: str = "INJOE Mecánicos API"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    def cors_origins_list(self) -> list[str]:
        return [origen.strip() for origen in self.CORS_ORIGINS.split(",") if origen.strip()]

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
