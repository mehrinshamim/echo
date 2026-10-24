from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

Provider = Literal["gemini", "openai", "groq"]

# OpenAI-compatible endpoints, so one client works for all of them
PROVIDER_URLS: dict[str, str] = {
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openai": "https://api.openai.com/v1",
    "groq": "https://api.groq.com/openai/v1",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).parent.parent / ".env", extra="ignore")

    # Supabase (Project Settings -> API)
    supabase_url: str
    supabase_anon_key: str

    # Provider keys (only the ones in use need a value)
    gemini_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""

    # Chat: FAST = cheap, frequent jobs; SMART = rare, quality-critical jobs
    chat_provider: Provider = "gemini"
    model_fast: str
    model_smart: str
    # Used for both tiers when the main chat provider errors (leave empty to disable)
    fallback_provider: Provider | None = None
    fallback_model: str = ""

    # Embeddings: changing provider/model means re-embedding all stored data
    embed_provider: Literal["gemini", "openai"] = "gemini"
    embed_model: str
    embed_dim: int = 768

    llm_log_path: Path = Path(__file__).parent.parent / "logs" / "llm.log"

    # Entries
    max_transcript_chars: int = 20000
    chunk_words: int = 250  # ~250 words per chunk for /ask
    chunk_overlap_words: int = 40
    max_themes_per_entry: int = 3
    theme_match_threshold: float = 0.85  # reuse an existing theme this similar in meaning
    entries_page_size: int = 50

    # Home
    home_theme_count: int = 6
    nudge_min_logs: int = 3  # "Echo noticed": a theme with this many logs...
    nudge_window_days: int = 7  # ...in this many days

    # Recurring-thought echoes: similar older entries shown after saving
    echo_count: int = 3
    echo_threshold: float = 0.75  # cosine similarity
    echo_min_age_days: int = 1
    echo_snippet_chars: int = 160

    cors_origins: list[str] = ["*"]

    def provider_key(self, provider: str) -> str:
        return {"gemini": self.gemini_api_key, "openai": self.openai_api_key, "groq": self.groq_api_key}[provider]


settings = Settings()
