"""Writing styles (S14–S17, SH1): upload pieces, group them into styles, manage styles."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app import llm, prompts
from app.config import settings
from app.deps import User, get_user
from app.textstats import stats

router = APIRouter(tags=["styles"])

STYLE_FIELDS = "id, name, traits, sample, where_used, updated_at, pieces(count)"
PIECE_FIELDS = "id, style_id, title, source, source_label, word_count, created_at"


class PieceIn(BaseModel):
    text: str = Field(min_length=1, max_length=settings.max_piece_chars)
    title: str | None = None
    source_label: str | None = None  # e.g. "Pasted", "talk-notes.md"


class PiecesIn(BaseModel):
    items: list[PieceIn] = Field(min_length=1, max_length=settings.max_pieces_per_upload)


class NameIn(BaseModel):
    name: str = Field(min_length=1)


class MergeIn(BaseModel):
    keep_id: str
    merge_id: str


class MovePieceIn(BaseModel):
    style_id: str


class VoiceProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    who_i_sound_like: str
    tone_hits: list[str]
    tone_never: list[str]
    rhythm: str
    openings: str
    closings: str
    signature_phrases: list[str]
    never_does: list[str]
    contradictions: list[str]


class StyleOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ref: str  # "S2" (existing) or "N1" (new)
    name: str
    traits: list[str]
    sample: str
    where_used: str
    profile: VoiceProfile


class Assignment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    piece: str  # "P1"
    style: str  # a style ref


class MergeOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    a: str
    b: str
    reason: str


class AnalysisOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    styles: list[StyleOut]
    assignments: list[Assignment]
    merges: list[MergeOut]


def style_out(row: dict) -> dict:
    pieces = row.pop("pieces", None)
    if isinstance(pieces, list) and pieces and "count" in pieces[0]:
        row["piece_count"] = pieces[0]["count"]
    return row


def excerpt(text: str) -> str:
    return text[: settings.style_excerpt_chars]


@router.post("/pieces")
async def add_pieces(body: PiecesIn, user: User = Depends(get_user)):
    """S14: save pasted/file text as pending pieces (no style yet)."""
    rows = [
        {
            "title": p.title or p.text.strip().split("\n")[0][:40],
            "text": p.text.strip(),
            "source": "pasted",
            "source_label": p.source_label or "Pasted",
            "word_count": len(p.text.split()),
        }
        for p in body.items
    ]
    res = await user.db.table("pieces").insert(rows).execute()
    return [{k: r[k] for k in PIECE_FIELDS.split(", ")} for r in res.data]


@router.get("/pieces")
async def pending_pieces(user: User = Depends(get_user)):
    """S14 'Added' list: pieces not analyzed yet."""
    res = await user.db.table("pieces").select(PIECE_FIELDS).is_("style_id", "null").order("created_at").execute()
    return res.data


@router.delete("/pieces/{piece_id}")
async def delete_piece(piece_id: str, user: User = Depends(get_user)):
    await user.db.table("pieces").delete().eq("id", piece_id).execute()
    return {"ok": True}


@router.patch("/pieces/{piece_id}")
async def move_piece(piece_id: str, body: MovePieceIn, user: User = Depends(get_user)):
    res = await user.db.table("pieces").update({"style_id": body.style_id}).eq("id", piece_id).execute()
    if not res.data:
        raise HTTPException(404, "Piece not found")
    return {k: res.data[0][k] for k in PIECE_FIELDS.split(", ")}


@router.post("/styles/analyze")
async def analyze(user: User = Depends(get_user)):
    """S15: one SMART call groups pending pieces into existing or new styles."""
    pending = (await user.db.table("pieces").select("id, title, text, source_label").is_("style_id", "null").order("created_at").execute()).data
    if not pending:
        raise HTTPException(400, "No new pieces to analyze")
    existing = (await user.db.table("styles").select("id, name, traits, where_used").execute()).data
    samples = (await user.db.table("pieces").select("style_id, text").not_.is_("style_id", "null").execute()).data

    piece_refs = {f"P{i + 1}": p for i, p in enumerate(pending)}
    style_refs = {f"S{i + 1}": s for i, s in enumerate(existing)}
    pieces_text = "\n\n".join(
        f'<piece label="{ref}" source="{p["source_label"]}" stats=\'{json.dumps(stats(p["text"]))}\'>\n{excerpt(p["text"])}\n</piece>'
        for ref, p in piece_refs.items()
    )
    styles_text = "\n\n".join(
        f'<style label="{ref}" name="{s["name"]}" where_used="{s["where_used"]}">\n'
        + "\n---\n".join(excerpt(x["text"]) for x in [x for x in samples if x["style_id"] == s["id"]][:2])
        + "\n</style>"
        for ref, s in style_refs.items()
    ) or "(none yet)"

    out = await llm.chat_json(
        settings.model_smart, prompts.STYLES_SYSTEM,
        prompts.STYLES_USER.format(pieces=pieces_text, styles=styles_text), AnalysisOut,
    )

    # Create or update styles, then point each piece at its style
    ids = {ref: s["id"] for ref, s in style_refs.items()}
    for s in out.styles:
        data = {"name": s.name, "traits": s.traits[:3], "sample": s.sample, "where_used": s.where_used,
                "profile": s.profile.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
        if s.ref in style_refs:
            await user.db.table("styles").update(data).eq("id", ids[s.ref]).execute()
        else:
            ids[s.ref] = (await user.db.table("styles").insert(data).execute()).data[0]["id"]

    assigned = 0
    for a in out.assignments:
        if a.piece in piece_refs and a.style in ids:
            await user.db.table("pieces").update({"style_id": ids[a.style]}).eq("id", piece_refs[a.piece]["id"]).execute()
            assigned += 1

    merge = next(
        ({"a": ids[m.a], "b": ids[m.b], "reason": m.reason} for m in out.merges if m.a in ids and m.b in ids and m.a != m.b),
        None,
    )
    styles = (await user.db.table("styles").select(STYLE_FIELDS).order("updated_at", desc=True).execute()).data
    return {"pieces_read": assigned, "styles": [style_out(s) for s in styles], "merge_suggestion": merge}


@router.get("/styles")
async def list_styles(user: User = Depends(get_user)):
    res = await user.db.table("styles").select(STYLE_FIELDS).order("updated_at", desc=True).execute()
    return [style_out(s) for s in res.data]


@router.get("/styles/{style_id}")
async def get_style(style_id: str, user: User = Depends(get_user)):
    res = await user.db.table("styles").select(f"{STYLE_FIELDS}, profile").eq("id", style_id).execute()
    if not res.data:
        raise HTTPException(404, "Style not found")
    pieces = await user.db.table("pieces").select(PIECE_FIELDS).eq("style_id", style_id).order("created_at", desc=True).execute()
    return {**style_out(res.data[0]), "pieces": pieces.data}


@router.patch("/styles/{style_id}")
async def rename_style(style_id: str, body: NameIn, user: User = Depends(get_user)):
    res = await user.db.table("styles").update({"name": body.name.strip()}).eq("id", style_id).execute()
    if not res.data:
        raise HTTPException(404, "Style not found")
    return await get_style(style_id, user)


@router.post("/styles/merge")
async def merge_styles(body: MergeIn, user: User = Depends(get_user)):
    """S16 'Merge': move every piece into keep_id and delete merge_id."""
    await user.db.table("pieces").update({"style_id": body.keep_id}).eq("style_id", body.merge_id).execute()
    await user.db.table("drafts").update({"style_id": body.keep_id}).eq("style_id", body.merge_id).execute()
    await user.db.table("styles").delete().eq("id", body.merge_id).execute()
    return await get_style(body.keep_id, user)
