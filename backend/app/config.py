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

    # Themes: evolution report
    report_max_logs: int = 60  # newest logs sent to the SMART model
    report_excerpt_chars: int = 500  # of each log's own words, for then/now quotes

    # Ask
    max_question_chars: int = 1000
    ask_top_k: int = 8
    ask_min_similarity: float = 0.5  # below this, "not in your journal" without an LLM call
    chat_title_chars: int = 60
    chat_history_turns: int = 2  # earlier question/answer pairs sent with a follow-up

    # Writing studio
    max_piece_chars: int = 20000
    max_pieces_per_upload: int = 20
    style_excerpt_chars: int = 1500  # of each piece sent to the LLM
    post_char_limit: int = 3000
    story_char_limit: int = 280
    draft_logs_per_theme: int = 5
    draft_log_chars: int = 2000
    draft_related_chunks: int = 4

    cors_origins: list[str] = ["*"]

    def provider_key(self, provider: str) -> str:
        return {"gemini": self.gemini_api_key, "openai": self.openai_api_key, "groq": self.groq_api_key}[provider]


settings = Settings()
