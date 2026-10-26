"""The only file that talks to LLM providers. Which provider is used is set in .env."""

import json
import re
from datetime import datetime, timezone

from openai import APIError, AsyncOpenAI, BadRequestError
from pydantic import BaseModel, ValidationError

from app.config import settings


def _client(provider: str) -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=settings.provider_url(provider),
        api_key=settings.provider_key(provider),
        max_retries=settings.llm_max_retries,
    )


chat_client = _client(settings.chat_provider)
embed_client = _client(settings.embed_provider)
fallback_client = _client(settings.fallback_provider) if settings.fallback_provider else None


def _log(model: str, raw: str) -> None:
    # Raw replies, so a bad parse can be debugged in seconds
    settings.llm_log_path.parent.mkdir(exist_ok=True)
    with settings.llm_log_path.open("a") as f:
        f.write(f"--- {datetime.now(timezone.utc).isoformat()} {model}\n{raw}\n")


def _extract_json(raw: str) -> str:
    """Gemma 4 wraps its answer in <thought>...</thought> and/or ``` fences. Keep just the JSON object."""
    raw = re.sub(r"<thought>.*?</thought>", "", raw, flags=re.DOTALL)
    start, end = raw.find("{"), raw.rfind("}")
    return raw[start : end + 1] if 0 <= start < end else raw.strip()


async def _complete(
    client: AsyncOpenAI, provider: str, model: str, system: str, user: str, out: type[BaseModel]
) -> str:
    schema = out.model_json_schema()
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]

    async def loose():
        # JSON mode with the schema in the prompt, for models without reliable strict schema support
        messages[0]["content"] += f"\n\nReply with only a JSON object matching this schema:\n{json.dumps(schema)}"
        return await client.chat.completions.create(model=model, messages=messages, response_format={"type": "json_object"})

    if provider == "gemma":  # accepts strict schemas but doesn't honour them (stray fences), so skip
        res = await loose()
    else:
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
            res = await loose()
    raw = res.choices[0].message.content or ""
    _log(model, raw)
    return _extract_json(raw)


async def chat_json[T: BaseModel](model: str, system: str, user: str, out: type[T]) -> T:
    """One chat call whose reply is validated into `out`. Retries once on bad JSON,
    and once on the fallback provider if the main provider errors."""
    client, provider = chat_client, settings.chat_provider
    try:
        raw = await _complete(client, provider, model, system, user, out)
    except APIError:
        if not fallback_client:
            raise
        client, provider, model = fallback_client, settings.fallback_provider, settings.fallback_model
        raw = await _complete(client, provider, model, system, user, out)
    try:
        return out.model_validate_json(raw)
    except ValidationError:
        raw = await _complete(client, provider, model, system, user, out)
        return out.model_validate_json(raw)


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed many texts in one call. Every vector has settings.embed_dim numbers."""
    res = await embed_client.embeddings.create(
        model=settings.embed_model, input=texts, dimensions=settings.embed_dim
    )
    return [d.embedding for d in res.data]
