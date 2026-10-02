from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    seed_on_startup: bool = True
    cors_origins: str = "http://localhost:5173"
    # The LLM summary needs BOTH the flag and a key, so a stray key never sends data anywhere.
    llm_summary_enabled: bool = False
    llm_api_key: str | None = None
    llm_model: str = "claude-haiku-4-5-20251001"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
