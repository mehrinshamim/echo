"""The only file that talks to the LLM provider (Gemini or OpenAI, set in .env)."""

import json

from openai import AsyncOpenAI

from app.config import settings

client = AsyncOpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)


async def chat_json(model: str, system: str, user: str, schema: dict, name: str = "result") -> dict:
    """One chat call whose reply must be JSON matching `schema`. Retries once on invalid JSON."""
    for attempt in range(2):
        res = await client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": name, "schema": schema, "strict": True},
            },
        )
        try:
            return json.loads(res.choices[0].message.content or "")
        except json.JSONDecodeError:
            if attempt == 1:
                raise


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed many texts in one call. Every vector has settings.embed_dim numbers."""
    res = await client.embeddings.create(
        model=settings.embed_model, input=texts, dimensions=settings.embed_dim
    )
    return [d.embedding for d in res.data]
