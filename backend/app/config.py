from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).parent.parent / ".env")

    # Supabase (Project Settings -> API)
    supabase_url: str
    supabase_anon_key: str

    # LLM provider: any OpenAI-compatible API (Gemini for dev, OpenAI for demo)
    llm_base_url: str
    llm_api_key: str
    model_fast: str
    model_smart: str
    embed_model: str
    embed_dim: int = 768

    cors_origins: list[str] = ["*"]


settings = Settings()
