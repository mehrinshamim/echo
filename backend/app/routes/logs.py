"""Logs (table: entries). Save pipeline, list/search, detail with related logs, theme edits."""

import asyncio
import json
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app import llm, prompts
from app.config import settings
from app.deps import User, get_user

router = APIRouter(prefix="/logs", tags=["logs"])

LOG_FIELDS = "id, title, created_at, duration_s, source, summary, insights, stance, transcript, themes(id, name)"
LIST_FIELDS = "id, title, created_at, duration_s, source, themes(id, name)"


class LogIn(BaseModel):
    text: str = Field(min_length=1, max_length=settings.max_transcript_chars)
    title: str | None = None  # typed logs have a user title; otherwise generated
    duration_s: int | None = None  # length of the voice capture
    source: Literal["voice", "typed", "mixed"] = "voice"
    created_at: datetime | None = None  # only for seeding test data with past dates


class TitleIn(BaseModel):
    title: str = Field(min_length=1)


class ThemeIn(BaseModel):
    name: str = Field(min_length=1)


class ThemeSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    description: str
    confidence: float


class LogAnalysis(BaseModel):
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


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)) or 1)


def parse_vector(v) -> list[float] | None:
    # PostgREST returns pgvector columns as text: "[0.1,0.2,...]"
    return json.loads(v) if isinstance(v, str) else v


def log_out(row: dict) -> dict:
    """Database row -> the log shape the app uses (S06)."""
    transcript = row.get("transcript")
    return {
        "id": row["id"],
        "title": row["title"],
        "created_at": row["created_at"],
        "duration_s": row.get("duration_s"),
        "source": row.get("source"),
        "transcript": transcript,
        "word_count": len(transcript.split()) if transcript else None,
        "summary": row.get("summary"),
        "key_points": row.get("insights", []),
        "stance": row.get("stance"),
        "themes": row.get("themes", []),
    }


async def touch_theme(user: User, theme: dict, created_at: datetime) -> None:
    last = theme.get("last_entry_at")
    if not last or datetime.fromisoformat(last) < created_at:
        await user.db.table("themes").update({"last_entry_at": created_at.isoformat()}).eq("id", theme["id"]).execute()


async def save_themes(
    user: User, entry_id: str, created_at: datetime, suggested: list[ThemeSuggestion],
    existing: list[dict], new_vectors: dict[str, list[float]],
) -> list[dict]:
    """Reuse an existing theme by name, then by meaning (embedding); otherwise create it."""
    by_name = {t["name"].lower(): t for t in existing}
    linked: dict[str, dict] = {}  # theme id -> {id, name}, keeps order and drops duplicates

    for s in suggested[: settings.max_themes_per_entry]:
        key = s.name.strip().lower()
        if not key:
            continue
        theme = by_name.get(key)
        if theme is None and key in new_vectors:
            scored = [(cosine(new_vectors[key], t["vec"]), t) for t in existing if t.get("vec")]
            best = max(scored, key=lambda x: x[0], default=None)
            if best and best[0] >= settings.theme_match_threshold:
                theme = best[1]
        if theme is None:
            ins = await user.db.table("themes").insert({
                "name": s.name.strip(),
                "description": s.description,
                "embedding": new_vectors.get(key),
                "last_entry_at": created_at.isoformat(),
            }).execute()
            theme = {**ins.data[0], "vec": new_vectors.get(key)}
            existing.append(theme)
            by_name[key] = theme
        else:
            await touch_theme(user, theme, created_at)
        if theme["id"] not in linked:
            linked[theme["id"]] = {"id": theme["id"], "name": theme["name"], "confidence": s.confidence}

    if linked:
        await user.db.table("entry_themes").insert(
            [{"entry_id": entry_id, "theme_id": t["id"], "confidence": t["confidence"]} for t in linked.values()]
        ).execute()
    return [{"id": t["id"], "name": t["name"]} for t in linked.values()]


async def find_related(user: User, entry_id: str, embedding: list[float], created_at: datetime) -> list[dict]:
    """Older logs that say similar things (S06 Related tab). Vector search only, no LLM call."""
    res = await user.db.rpc("match_entries", {
        "query_embedding": embedding,
        "match_count": settings.echo_count,
        "exclude_id": entry_id,
    }).execute()

    cutoff = created_at - timedelta(days=settings.echo_min_age_days)
    matches = [
        m for m in res.data
        if m["similarity"] >= settings.echo_threshold and datetime.fromisoformat(m["created_at"]) <= cutoff
    ]
    if not matches:
        return []

    themes = await user.db.table("entries").select("id, themes(name)").in_("id", [m["id"] for m in matches]).execute()
    theme_of = {r["id"]: (r["themes"][0]["name"] if r["themes"] else None) for r in themes.data}
    return [
        {
            "log_id": m["id"],
            "date": m["created_at"],
            "title": m["title"],
            "theme": theme_of.get(m["id"]),
            "snippet": (m["summary"] or "")[: settings.echo_snippet_chars],
            "similarity": round(m["similarity"], 3),
        }
        for m in matches
    ]


@router.post("")
async def create_log(body: LogIn, user: User = Depends(get_user)):
    text = body.text.strip()
    created_at = body.created_at or datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    res = await user.db.table("themes").select("id, name, description, last_entry_at, embedding").execute()
    existing = [{**t, "vec": parse_vector(t.pop("embedding"))} for t in res.data]
    theme_list = "\n".join(f"- {t['name']}: {t['description'] or ''}" for t in existing) or "(none yet)"

    # 1. In parallel: one FAST call (title, summary, key points, stance, themes) + chunk embeddings
    chunks = chunk_text(text)
    out, chunk_vectors = await asyncio.gather(
        llm.chat_json(
            settings.model_fast,
            prompts.ENTRY_SYSTEM,
            prompts.ENTRY_USER.format(themes=theme_list, transcript=text),
            LogAnalysis,
        ),
        llm.embed(chunks),
    )

    # 2. One more embedding call: the summary + any theme names that don't match an existing name
    names = {t["name"].lower() for t in existing}
    new_themes = [s for s in out.themes if s.name.strip().lower() not in names]
    vectors = await llm.embed([out.summary, *[f"{s.name}: {s.description}" for s in new_themes]])
    new_vectors = {s.name.strip().lower(): v for s, v in zip(new_themes, vectors[1:])}

    # 3. Save the log, its chunks and themes
    ins = await user.db.table("entries").insert({
        "transcript": text,
        "title": body.title or out.title,
        "summary": out.summary,
        "insights": out.insights,
        "stance": out.stance,
        "duration_s": body.duration_s,
        "source": body.source,
        "embedding": vectors[0],
        "created_at": created_at.isoformat(),
    }).execute()
    row = ins.data[0]

    await user.db.table("chunks").insert(
        [{"entry_id": row["id"], "content": c, "embedding": v} for c, v in zip(chunks, chunk_vectors)]
    ).execute()

    themes = await save_themes(user, row["id"], created_at, out.themes, existing, new_vectors)

    # 4. Older logs about the same thing
    related = await find_related(user, row["id"], vectors[0], created_at)

    return {
        **log_out({**row, "themes": themes}),
        "related": related,
        "steps": {"themes_added": len(themes), "related_found": len(related)},  # S05 checklist
    }


@router.get("")
async def list_logs(user: User = Depends(get_user), before: datetime | None = None, q: str | None = None):
    query = user.db.table("entries").select(LIST_FIELDS).order("created_at", desc=True)
    if before:
        query = query.lt("created_at", before.isoformat())
    if q:
        term = re.sub(r"[,()%]", " ", q).strip()  # characters that would break the filter syntax
        query = query.or_(f"title.ilike.%{term}%,transcript.ilike.%{term}%")
    res = await query.limit(settings.entries_page_size).execute()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "created_at": r["created_at"],
            "duration_s": r["duration_s"],
            "source": r["source"],
            "primary_theme": r["themes"][0] if r["themes"] else None,
        }
        for r in res.data
    ]


async def fetch_log(user: User, log_id: str, fields: str = LOG_FIELDS) -> dict:
    res = await user.db.table("entries").select(fields).eq("id", log_id).execute()
    if not res.data:
        raise HTTPException(404, "Log not found")
    return res.data[0]


@router.get("/{log_id}")
async def get_log(log_id: str, user: User = Depends(get_user)):
    row = await fetch_log(user, log_id, f"{LOG_FIELDS}, embedding")
    embedding = parse_vector(row.pop("embedding"))
    created_at = datetime.fromisoformat(row["created_at"])
    related = await find_related(user, log_id, embedding, created_at) if embedding else []
    return {**log_out(row), "related": related}


@router.patch("/{log_id}")
async def rename_log(log_id: str, body: TitleIn, user: User = Depends(get_user)):
    res = await user.db.table("entries").update({"title": body.title}).eq("id", log_id).execute()
    if not res.data:
        raise HTTPException(404, "Log not found")
    return log_out(await fetch_log(user, log_id))


@router.post("/{log_id}/themes")
async def add_theme(log_id: str, body: ThemeIn, user: User = Depends(get_user)):
    """S06 '+ Add theme': attach an existing theme by name, or create it."""
    row = await fetch_log(user, log_id, "id, created_at")
    name = body.name.strip()
    res = await user.db.table("themes").select("id, name, last_entry_at").ilike("name", name).execute()
    if res.data:
        theme = res.data[0]
        await touch_theme(user, theme, datetime.fromisoformat(row["created_at"]))
    else:
        [vec] = await llm.embed([name])
        ins = await user.db.table("themes").insert(
            {"name": name, "embedding": vec, "last_entry_at": row["created_at"]}
        ).execute()
        theme = ins.data[0]
    await user.db.table("entry_themes").upsert({"entry_id": log_id, "theme_id": theme["id"]}).execute()
    return log_out(await fetch_log(user, log_id))


@router.delete("/{log_id}/themes/{theme_id}")
async def remove_theme(log_id: str, theme_id: str, user: User = Depends(get_user)):
    await user.db.table("entry_themes").delete().eq("entry_id", log_id).eq("theme_id", theme_id).execute()
    return log_out(await fetch_log(user, log_id))
