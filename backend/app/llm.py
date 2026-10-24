"""The only file that talks to LLM providers. Which provider is used is set in .env."""

import json
from datetime import datetime, timezone

from openai import APIError, AsyncOpenAI, BadRequestError
from pydantic import BaseModel, ValidationError

from app.config import PROVIDER_URLS, settings


def _client(provider: str) -> AsyncOpenAI:
    return AsyncOpenAI(base_url=PROVIDER_URLS[provider], api_key=settings.provider_key(provider))


chat_client = _client(settings.chat_provider)
embed_client = _client(settings.embed_provider)
fallback_client = _client(settings.fallback_provider) if settings.fallback_provider else None


def _log(model: str, raw: str) -> None:
    # Raw replies, so a bad parse can be debugged in seconds
    settings.llm_log_path.parent.mkdir(exist_ok=True)
    with settings.llm_log_path.open("a") as f:
        f.write(f"--- {datetime.now(timezone.utc).isoformat()} {model}\n{raw}\n")


async def _complete(client: AsyncOpenAI, model: str, system: str, user: str, out: type[BaseModel]) -> str:
    schema = out.model_json_schema()
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    try:
        res = await client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {"name": out.__name__, "schema": schema, "strict": True},
            },
        )
    except BadRequestError:
        # Provider/model without strict schema support: plain JSON mode, schema in the prompt
        messages[0]["content"] += f"\n\nReply with only a JSON object matching this schema:\n{json.dumps(schema)}"
        res = await client.chat.completions.create(
            model=model, messages=messages, response_format={"type": "json_object"}
        )
    raw = res.choices[0].message.content or ""
    _log(model, raw)
    return raw


async def chat_json[T: BaseModel](model: str, system: str, user: str, out: type[T]) -> T:
    """One chat call whose reply is validated into `out`. Retries once on bad JSON,
    and once on the fallback provider if the main provider errors."""
    client = chat_client
    try:
        raw = await _complete(client, model, system, user, out)
    except APIError:
        if not fallback_client:
            raise
        client, model = fallback_client, settings.fallback_model
        raw = await _complete(client, model, system, user, out)
    try:
        return out.model_validate_json(raw)
    except ValidationError:
        raw = await _complete(client, model, system, user, out)
        return out.model_validate_json(raw)


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed many texts in one call. Every vector has settings.embed_dim numbers."""
    res = await embed_client.embeddings.create(
        model=settings.embed_model, input=texts, dimensions=settings.embed_dim
    )
    return [d.embedding for d in res.data]
