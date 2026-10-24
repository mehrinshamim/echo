"""Themes (S09): list, detail with logs, rename, and the cached evolution report."""

import hashlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app import llm, prompts
from app.config import settings
from app.deps import User, get_user

router = APIRouter(prefix="/themes", tags=["themes"])


class NameIn(BaseModel):
    name: str = Field(min_length=1)


class Moment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    quote: str
    log: str  # label, e.g. "E3"


class Shift(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    log: str


class ReportOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    overview: str
    then: Moment
    now: Moment
    shifts: list[Shift]
    open_question: str


async def theme_with_stats(user: User, theme_id: str) -> dict:
    stats = await user.db.rpc("theme_stats", {}).execute()
    theme = next((t for t in stats.data if t["id"] == theme_id), None)
    if theme is None:
        raise HTTPException(404, "Theme not found")
    return theme


async def theme_logs(user: User, theme_id: str, fields: str, newest_first: bool) -> list[dict]:
    res = await (
        user.db.table("entries")
        .select(f"{fields}, entry_themes!inner(theme_id)")
        .eq("entry_themes.theme_id", theme_id)
        .order("created_at", desc=newest_first)
        .execute()
    )
    for r in res.data:
        r.pop("entry_themes", None)
    return res.data


@router.get("")
async def list_themes(user: User = Depends(get_user)):
    res = await user.db.rpc("theme_stats", {}).execute()
    return res.data


@router.get("/{theme_id}")
async def get_theme(theme_id: str, user: User = Depends(get_user)):
    theme = await theme_with_stats(user, theme_id)
    logs = await theme_logs(user, theme_id, "id, title, created_at, duration_s, source", newest_first=True)
    return {**theme, "logs": logs}


@router.patch("/{theme_id}")
async def rename_theme(theme_id: str, body: NameIn, user: User = Depends(get_user)):
    res = await user.db.table("themes").update({"name": body.name.strip()}).eq("id", theme_id).execute()
    if not res.data:
        raise HTTPException(404, "Theme not found")
    return await theme_with_stats(user, theme_id)


@router.get("/{theme_id}/report")
async def get_report(theme_id: str, user: User = Depends(get_user)):
    """'How it changed'. Cached until the set of logs in the theme changes."""
    theme = await theme_with_stats(user, theme_id)
    logs = await theme_logs(
        user, theme_id, "id, title, created_at, summary, insights, stance, transcript", newest_first=False
    )
    logs = logs[-settings.report_max_logs :]
    if len(logs) < 2:
        return {"status": "not_enough_history", "log_count": len(logs), "report": None}

    source_hash = hashlib.sha1(",".join(sorted(l["id"] for l in logs)).encode()).hexdigest()
    cached = await user.db.table("theme_reports").select("report, source_hash").eq("theme_id", theme_id).execute()
    if cached.data and cached.data[0]["source_hash"] == source_hash:
        return {"status": "ok", "cached": True, "log_count": len(logs), "report": cached.data[0]["report"]}

    # One SMART call over the theme's logs, labelled E1..En so ids can't be invented
    labels = {f"E{i + 1}": l for i, l in enumerate(logs)}
    text = "\n".join(
        prompts.REPORT_LOG.format(
            label=label,
            date=l["created_at"][:10],
            summary=l["summary"] or "",
            key_points="; ".join(l["insights"] or []),
            stance=l["stance"] or "",
            excerpt=(l["transcript"] or "")[: settings.report_excerpt_chars],
        )
        for label, l in labels.items()
    )
    out = await llm.chat_json(
        settings.model_smart, prompts.REPORT_SYSTEM, prompts.REPORT_USER.format(name=theme["name"], logs=text), ReportOut
    )

    def cite(label: str) -> dict | None:
        l = labels.get(label.strip())
        return {"log_id": l["id"], "date": l["created_at"], "title": l["title"]} if l else None

    report = {
        "overview": out.overview,
        "then": {"quote": out.then.quote, **(cite(out.then.log) or {})},
        "now": {"quote": out.now.quote, **(cite(out.now.log) or {})},
        "shifts": [{"text": s.text, **c} for s in out.shifts if (c := cite(s.log))],
        "open_question": out.open_question,
    }
    await user.db.table("theme_reports").upsert(
        {"theme_id": theme_id, "report": report, "entry_count": len(logs), "source_hash": source_hash},
        on_conflict="theme_id",
    ).execute()
    return {"status": "ok", "cached": False, "log_count": len(logs), "report": report}
