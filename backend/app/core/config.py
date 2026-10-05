from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        extra="ignore",
        case_sensitive=False,
    )

    DATABASE_URL: str = "postgresql://gabrieltates:gabrieltates@localhost:5432/mecanicos_db"
    AUTOCARE_DATABASE_URL: str = "postgresql://gabrieltates:gabrieltates@localhost:5432/autocare_db"
    SECRET_KEY: str = "cambiar-esta-clave-en-produccion-injoe-mecanicos"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_HOURS: int = 24
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8003
    CORS_ORIGINS: str = "http://localhost:3003,http://127.0.0.1:3003"
    APP_NAME: str = "INJOE MECHANICS API"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SRI_SIGN_URL: str = "http://localhost:8000/sri"
    SRI_SIGN_SECRET_KEY: str = "admin123"
    SRI_ENVIRONMENT: str = "1"
    SRI_RETRY_INTERVAL_SECONDS: int = 60
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NAME: str = "INJOE Mechanics"
    SMTP_USE_TLS: bool = True
    PDF_RUC_PROVEEDOR: str = "1722879176001"

    def cors_origins_list(self) -> list[str]:
        return [origen.strip() for origen in self.CORS_ORIGINS.split(",") if origen.strip()]

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
