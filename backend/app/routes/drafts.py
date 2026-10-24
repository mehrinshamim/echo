"""Drafts (S18, S13, SH2, S12): generate in the user's voice, edit, revise, save, publish."""

import json
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app import llm, prompts
from app.config import settings
from app.deps import User, get_user

router = APIRouter(prefix="/drafts", tags=["drafts"])

Kind = Literal["linkedin", "blog", "story"]
KIND_LABELS = {"linkedin": "a LinkedIn post", "blog": "a blog post", "story": "a short story thread post"}
DRAFT_FIELDS = (
    "id, kind, title, text, prompt, style_id, source_log_ids, status, version, platform, url, "
    "created_at, updated_at, saved_at, published_at, styles(name)"
)


class DraftIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=settings.max_question_chars)
    style_id: str | None = None  # None = "Let Echo choose"
    log_ids: list[str] = []
    theme_ids: list[str] = []
    kind: Kind = "linkedin"


class TextIn(BaseModel):
    text: str


class Selection(BaseModel):
    start: int = Field(ge=0)
    end: int = Field(ge=0)


class ReviseIn(BaseModel):
    instruction: str = Field(min_length=1, max_length=settings.max_question_chars)
    selection: Selection | None = None


class RestyleIn(BaseModel):
    style_id: str


class PublishIn(BaseModel):
    platform: Literal["linkedin", "blog", "other"]
    url: str | None = None


class StylePick(BaseModel):
    model_config = ConfigDict(extra="forbid")
    style: str  # label, e.g. "S2"


class DraftOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    text: str
    why: str


class RevisedOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def char_limit(kind: str) -> int:
    return settings.story_char_limit if kind == "story" else settings.post_char_limit


async def fetch_draft(user: User, draft_id: str) -> dict:
    res = await user.db.table("drafts").select(DRAFT_FIELDS).eq("id", draft_id).execute()
    if not res.data:
        raise HTTPException(404, "Draft not found")
    return res.data[0]


async def draft_out(user: User, row: dict) -> dict:
    style = row.pop("styles", None)
    logs = []
    if row["source_log_ids"]:
        res = await user.db.table("entries").select("id, title, created_at").in_("id", row["source_log_ids"]).execute()
        logs = res.data
    return {**row, "style_name": style["name"] if style else None, "source_logs": logs, "char_limit": char_limit(row["kind"])}


async def add_version(user: User, draft: dict, text: str, author: str, instruction: str | None, extra: dict | None = None) -> dict:
    """Every change is a new version; versions are never overwritten."""
    n = draft["version"] + 1
    await user.db.table("draft_versions").insert(
        {"draft_id": draft["id"], "n": n, "text": text, "author": author, "instruction": instruction}
    ).execute()
    await user.db.table("drafts").update({"text": text, "version": n, "updated_at": now(), **(extra or {})}).eq("id", draft["id"]).execute()
    return await draft_out(user, await fetch_draft(user, draft["id"]))


async def pick_style(user: User, prompt: str) -> str | None:
    """'Let Echo choose': a FAST call picks the closest style."""
    styles = (await user.db.table("styles").select("id, name, traits, where_used").execute()).data
    if len(styles) <= 1:
        return styles[0]["id"] if styles else None
    refs = {f"S{i + 1}": s for i, s in enumerate(styles)}
    listing = "\n".join(f"{r}: {s['name']} ({s['where_used']}) - {'; '.join(s['traits'])}" for r, s in refs.items())
    out = await llm.chat_json(settings.model_fast, prompts.STYLE_PICK_SYSTEM, f"Styles:\n{listing}\n\nWants to post: {prompt}", StylePick)
    return refs.get(out.style.strip(), styles[0])["id"]


async def generate(user: User, prompt: str, style_id: str | None, log_ids: list[str], kind: str) -> DraftOut:
    """One SMART call: content from the user's logs, voice from the style profile + 2 example pieces."""
    logs = []
    if log_ids:
        logs = (await user.db.table("entries").select("id, title, created_at, summary, transcript").in_("id", log_ids).order("created_at").execute()).data
    [p_vec] = await llm.embed([prompt])
    chunks = (await user.db.rpc("match_chunks", {"query_embedding": p_vec, "match_count": settings.draft_related_chunks}).execute()).data
    chunks = [c for c in chunks if c["entry_id"] not in log_ids]

    style, examples = None, []
    if style_id:
        res = await user.db.table("styles").select("name, profile").eq("id", style_id).execute()
        style = res.data[0] if res.data else None
        examples = (await user.db.table("pieces").select("text").eq("style_id", style_id).limit(2).execute()).data

    limit = char_limit(kind)
    return await llm.chat_json(
        settings.model_smart,
        prompts.DRAFT_SYSTEM.format(kind=KIND_LABELS[kind], char_limit=limit),
        prompts.DRAFT_USER.format(
            prompt=prompt,
            logs="\n\n".join(f"{l['created_at'][:10]} · {l['title']}\n{l['transcript'][: settings.draft_log_chars]}" for l in logs) or "(none chosen)",
            excerpts="\n\n".join(f"{c['created_at'][:10]} · {c['title']}\n{c['content']}" for c in chunks) or "(none)",
            style_name=style["name"] if style else "none yet",
            profile=json.dumps(style["profile"]) if style else "(no style learned yet: write plainly in first person)",
            examples="\n---\n".join(e["text"][: settings.style_excerpt_chars] for e in examples) or "(none)",
        ),
        DraftOut,
    )


@router.post("")
async def create_draft(body: DraftIn, user: User = Depends(get_user)):
    log_ids = list(body.log_ids)
    for theme_id in body.theme_ids:  # a theme chip brings in its most recent logs
        res = await (
            user.db.table("entries").select("id, entry_themes!inner(theme_id)").eq("entry_themes.theme_id", theme_id)
            .order("created_at", desc=True).limit(settings.draft_logs_per_theme).execute()
        )
        log_ids += [r["id"] for r in res.data if r["id"] not in log_ids]

    style_id = body.style_id or await pick_style(user, body.prompt)
    out = await generate(user, body.prompt, style_id, log_ids, body.kind)

    ins = await user.db.table("drafts").insert({
        "kind": body.kind, "title": out.title, "text": out.text, "prompt": body.prompt,
        "style_id": style_id, "source_log_ids": log_ids,
    }).execute()
    draft = ins.data[0]
    await user.db.table("draft_versions").insert(
        {"draft_id": draft["id"], "n": 1, "text": out.text, "author": "ai", "instruction": body.prompt}
    ).execute()
    return {**await draft_out(user, await fetch_draft(user, draft["id"])), "why": out.why}


@router.get("")
async def list_drafts(user: User = Depends(get_user), status: Literal["draft", "saved", "published"] | None = None):
    q = user.db.table("drafts").select(DRAFT_FIELDS).order("updated_at", desc=True)
    if status:
        q = q.eq("status", status)
    rows = (await q.execute()).data
    for r in rows:
        style = r.pop("styles", None)
        r["style_name"] = style["name"] if style else None
        r["log_count"] = len(r["source_log_ids"])
    return rows


@router.get("/{draft_id}")
async def get_draft(draft_id: str, user: User = Depends(get_user)):
    return await draft_out(user, await fetch_draft(user, draft_id))


@router.get("/{draft_id}/versions")
async def list_versions(draft_id: str, user: User = Depends(get_user)):
    res = await user.db.table("draft_versions").select("n, text, author, instruction, created_at").eq("draft_id", draft_id).order("n").execute()
    return res.data


@router.put("/{draft_id}")
async def edit_draft(draft_id: str, body: TextIn, user: User = Depends(get_user)):
    """Manual edit (autosave) -> new user version."""
    draft = await fetch_draft(user, draft_id)
    if body.text == draft["text"]:
        return await draft_out(user, draft)
    return await add_version(user, draft, body.text, "user", None)


@router.post("/{draft_id}/revise")
async def revise_draft(draft_id: str, body: ReviseIn, user: User = Depends(get_user)):
    """Revision chips and 'Ask for changes'. With a selection, only that span is rewritten."""
    draft = await fetch_draft(user, draft_id)
    text, limit = draft["text"], char_limit(draft["kind"])
    sel = body.selection
    if sel and sel.start < sel.end <= len(text):
        out = await llm.chat_json(
            settings.model_smart, prompts.REVISE_SELECTION_SYSTEM,
            prompts.REVISE_USER.format(instruction=body.instruction, text=text, selection=text[sel.start : sel.end]),
            RevisedOut,
        )
        new_text = text[: sel.start] + out.text + text[sel.end :]
    else:
        out = await llm.chat_json(
            settings.model_smart, prompts.REVISE_SYSTEM.format(char_limit=limit),
            prompts.REVISE_USER.format(instruction=body.instruction, text=text, selection="(whole post)"),
            RevisedOut,
        )
        new_text = out.text
    return await add_version(user, draft, new_text, "ai", body.instruction)


@router.post("/{draft_id}/restyle")
async def restyle_draft(draft_id: str, body: RestyleIn, user: User = Depends(get_user)):
    """Style chip switch: regenerate from the same logs in another style (new version)."""
    draft = await fetch_draft(user, draft_id)
    out = await generate(user, draft["prompt"] or draft["title"] or "", body.style_id, draft["source_log_ids"], draft["kind"])
    return await add_version(user, draft, out.text, "ai", "restyle", {"style_id": body.style_id})


@router.post("/{draft_id}/save")
async def save_draft(draft_id: str, user: User = Depends(get_user)):
    await fetch_draft(user, draft_id)
    await user.db.table("drafts").update({"status": "saved", "saved_at": now(), "updated_at": now()}).eq("id", draft_id).execute()
    return await draft_out(user, await fetch_draft(user, draft_id))


@router.post("/{draft_id}/publish")
async def publish_draft(draft_id: str, body: PublishIn, user: User = Depends(get_user)):
    """SH2: mark published; the post becomes a new piece in its style, so future drafts sound more like it."""
    draft = await fetch_draft(user, draft_id)
    published_at = datetime.now(timezone.utc)
    await user.db.table("drafts").update({
        "status": "published", "platform": body.platform, "url": body.url,
        "published_at": published_at.isoformat(), "updated_at": now(),
    }).eq("id", draft_id).execute()
    if draft["style_id"]:
        await user.db.table("pieces").insert({
            "style_id": draft["style_id"], "title": draft["title"], "text": draft["text"], "source": "published",
            "source_label": f"{body.platform.capitalize()} · published {published_at.strftime('%-d %b')}",
            "word_count": len(draft["text"].split()),
        }).execute()
    return await draft_out(user, await fetch_draft(user, draft_id))
