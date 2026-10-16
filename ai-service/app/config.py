import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    PORT: int = Field(default=8000, alias="PORT")
    HOST: str = Field(default="0.0.0.0", alias="HOST")
    LLM_PROVIDER: str = Field(default="fallback", alias="LLM_PROVIDER") # "gemini", "openai", "fallback"
    GEMINI_API_KEY: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    LLM_MODEL_NAME: str = Field(default="gemini-1.5-flash", alias="LLM_MODEL_NAME")
    TIMEOUT_SECONDS: float = Field(default=10.0, alias="TIMEOUT_SECONDS")
    MAX_RETRIES: int = Field(default=2, alias="MAX_RETRIES")
    CACHE_TTL_SECONDS: int = Field(default=3600, alias="CACHE_TTL_SECONDS")
    ALLOWED_ORIGINS: str = Field(default="http://localhost:5000,http://localhost:5173", alias="ALLOWED_ORIGINS")
    INTERNAL_API_KEY: str = Field(default="scrollsense_internal_ai_secret_key", alias="INTERNAL_API_KEY")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
