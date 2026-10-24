import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app import llm, prompts
from app.config import settings
from app.deps import User, get_user

router = APIRouter(prefix="/entries", tags=["entries"])

LIST_FIELDS = "id, title, summary, insights, stance, created_at, themes(id, name)"


class EntryIn(BaseModel):
    transcript: str = Field(min_length=1, max_length=settings.max_transcript_chars)
    created_at: datetime | None = None  # only for seeding test data with past dates


class ThemeSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    description: str
    confidence: float


class EntryAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    summary: str
    insights: list[str]
    stance: str
    themes: list[ThemeSuggestion]


def chunk_text(text: str) -> list[str]:
    """Split into ~chunk_words pieces on sentence boundaries, overlapping by ~chunk_overlap_words."""
    words = text.split()
    if len(words) <= settings.chunk_words * 1.2:
        return [" ".join(words)]

    # Sentences; a run-on longer than a chunk (no punctuation) is cut into word blocks
    sentences: list[list[str]] = []
    for s in re.split(r"(?<=[.!?])\s+", text):
        w = s.split()
        step = settings.chunk_words - settings.chunk_overlap_words
        for i in range(0, len(w), step):
            sentences.append(w[i : i + step])

    chunks, current = [], []
    for s in sentences:
        if current and len(current) + len(s) > settings.chunk_words:
            chunks.append(" ".join(current))
            current = current[-settings.chunk_overlap_words :]
        current += s
    if current:
        chunks.append(" ".join(current))
    return chunks


async def save_themes(user: User, entry_id: str, created_at: datetime, suggested: list[ThemeSuggestion]) -> list[dict]:
    """Reuse existing themes by name (case-insensitive), create new ones, link them to the entry."""
    res = await user.db.table("themes").select("id, name, last_entry_at").execute()
    existing = {t["name"].lower(): t for t in res.data}

    linked, names, seen = [], [], set()
    for t in suggested[: settings.max_themes_per_entry]:
        key = t.name.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)

        theme = existing.get(key)
        if theme is None:
            ins = await user.db.table("themes").insert({
                "name": t.name.strip(),
                "description": t.description,
                "last_entry_at": created_at.isoformat(),
            }).execute()
            theme = ins.data[0]
        elif not theme["last_entry_at"] or datetime.fromisoformat(theme["last_entry_at"]) < created_at:
            await user.db.table("themes").update(
                {"last_entry_at": created_at.isoformat()}
            ).eq("id", theme["id"]).execute()

        linked.append({"entry_id": entry_id, "theme_id": theme["id"], "confidence": t.confidence})
        names.append(theme["name"])

    if linked:
        await user.db.table("entry_themes").insert(linked).execute()
    return [{"id": l["theme_id"], "name": n} for l, n in zip(linked, names)]


async def find_echoes(user: User, entry_id: str, embedding: list[float], created_at: datetime) -> list[dict]:
    """Older entries similar to this one: 'You thought about this on ...'. No LLM call."""
    res = await user.db.rpc("match_entries", {
        "query_embedding": embedding,
        "match_count": settings.echo_count,
        "exclude_id": entry_id,
    }).execute()

    cutoff = created_at - timedelta(days=settings.echo_min_age_days)
    return [
        {
            "entry_id": m["id"],
            "date": m["created_at"],
            "title": m["title"],
            "snippet": (m["summary"] or "")[: settings.echo_snippet_chars],
            "similarity": round(m["similarity"], 3),
        }
        for m in res.data
        if m["similarity"] >= settings.echo_threshold
        and datetime.fromisoformat(m["created_at"]) <= cutoff
    ]


@router.post("")
async def create_entry(body: EntryIn, user: User = Depends(get_user)):
    transcript = body.transcript.strip()
    created_at = body.created_at or datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    # 1. One FAST call: title, summary, insights, stance, themes
    res = await user.db.table("themes").select("name, description").execute()
    theme_list = "\n".join(f"- {t['name']}: {t['description'] or ''}" for t in res.data) or "(none yet)"
    out = await llm.chat_json(
        settings.model_fast,
        prompts.ENTRY_SYSTEM,
        prompts.ENTRY_USER.format(themes=theme_list, transcript=transcript),
        EntryAnalysis,
    )

    # 2. One batched embedding call: the summary + every transcript chunk
    chunks = chunk_text(transcript)
    vectors = await llm.embed([out.summary, *chunks])

    # 3. Save entry, chunks, themes
    ins = await user.db.table("entries").insert({
        "transcript": transcript,
        "title": out.title,
        "summary": out.summary,
        "insights": out.insights,
        "stance": out.stance,
        "embedding": vectors[0],
        "created_at": created_at.isoformat(),
    }).execute()
    entry = ins.data[0]

    await user.db.table("chunks").insert([
        {"entry_id": entry["id"], "content": c, "embedding": v} for c, v in zip(chunks, vectors[1:])
    ]).execute()

    themes = await save_themes(user, entry["id"], created_at, out.themes)

    # 4. Recurring-thought echoes
    echoes = await find_echoes(user, entry["id"], vectors[0], created_at)

    entry.pop("embedding", None)
    return {**entry, "themes": themes, "echoes": echoes}


@router.get("")
async def list_entries(user: User = Depends(get_user), before: datetime | None = None):
    q = user.db.table("entries").select(LIST_FIELDS).order("created_at", desc=True)
    if before:
        q = q.lt("created_at", before.isoformat())
    res = await q.limit(settings.entries_page_size).execute()
    return res.data


@router.get("/{entry_id}")
async def get_entry(entry_id: str, user: User = Depends(get_user)):
    res = await user.db.table("entries").select(f"transcript, {LIST_FIELDS}").eq("id", entry_id).execute()
    if not res.data:
        raise HTTPException(404, "Entry not found")
    return res.data[0]
