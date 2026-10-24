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

    # Entries
    max_transcript_chars: int = 20000
    chunk_words: int = 250  # ~250 words per chunk for /ask
    chunk_overlap_words: int = 40
    max_themes_per_entry: int = 3
    entries_page_size: int = 50

    # Recurring-thought echoes: similar older entries shown after saving
    echo_count: int = 3
    echo_threshold: float = 0.75  # cosine similarity
    echo_min_age_days: int = 1
    echo_snippet_chars: int = 160

    cors_origins: list[str] = ["*"]


settings = Settings()
