"""Ask (S10, S11): answers only from the user's logs, with [n] citations. Chats are saved."""

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app import llm, prompts
from app.config import settings
from app.deps import User, get_user

router = APIRouter(prefix="/chats", tags=["chats"])

NOT_IN_JOURNAL = "That isn't in your journal yet."


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=settings.max_question_chars)
    theme_ids: list[str] = []  # context chips
    log_ids: list[str] = []


class FollowUpIn(BaseModel):
    question: str = Field(min_length=1, max_length=settings.max_question_chars)


class AnswerOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    supported: bool
    text: str


async def answer(user: User, question: str, theme_ids: list[str], log_ids: list[str], history: list[dict]) -> dict:
    [q_vec] = await llm.embed([question])

    # Retrieve: closest transcript chunks, optionally limited to the chosen theme/logs
    res = await user.db.rpc("match_chunks", {
        "query_embedding": q_vec,
        "match_count": settings.ask_top_k * (3 if log_ids else 1),
        "filter_theme_id": theme_ids[0] if theme_ids else None,
    }).execute()
    chunks = [c for c in res.data if not log_ids or c["entry_id"] in log_ids][: settings.ask_top_k]

    # Nothing close enough: answer without calling the LLM
    if not chunks or chunks[0]["similarity"] < settings.ask_min_similarity:
        return {"text": NOT_IN_JOURNAL, "supported": False, "citations": []}

    excerpts = "\n\n".join(
        f"[{i + 1}] {c['created_at'][:10]} · {c['title']}\n{c['content']}" for i, c in enumerate(chunks)
    )
    turns = "\n".join(f"{m['role']}: {m['text']}" for m in history) or "(none)"
    out = await llm.chat_json(
        settings.model_fast,
        prompts.ASK_SYSTEM,
        prompts.ASK_USER.format(excerpts=excerpts, history=turns, question=question),
        AnswerOut,
    )
    if not out.supported:
        return {"text": out.text or NOT_IN_JOURNAL, "supported": False, "citations": []}

    # Keep only citation numbers we actually gave; drop the rest from the text
    used = sorted({int(n) for n in re.findall(r"\[(\d+)\]", out.text) if 1 <= int(n) <= len(chunks)})
    text = re.sub(r"\[(\d+)\]", lambda m: m.group(0) if int(m.group(1)) in used else "", out.text)
    citations = [
        {
            "n": n,
            "log_id": chunks[n - 1]["entry_id"],
            "title": chunks[n - 1]["title"],
            "date": chunks[n - 1]["created_at"],
            "snippet": chunks[n - 1]["content"][: settings.echo_snippet_chars],
        }
        for n in used
    ]
    return {"text": text, "supported": True, "citations": citations}


async def save_turn(user: User, chat_id: str, question: str, reply: dict) -> None:
    # Two inserts so the question gets an earlier timestamp than the answer
    await user.db.table("chat_messages").insert({"chat_id": chat_id, "role": "user", "text": question}).execute()
    await user.db.table("chat_messages").insert(
        {"chat_id": chat_id, "role": "assistant", "text": reply["text"], "citations": reply["citations"]}
    ).execute()


@router.post("")
async def new_chat(body: AskIn, user: User = Depends(get_user)):
    reply = await answer(user, body.question, body.theme_ids, body.log_ids, [])
    ins = await user.db.table("chats").insert({
        "title": body.question[: settings.chat_title_chars],
        "theme_ids": body.theme_ids,
        "log_ids": body.log_ids,
    }).execute()
    chat = ins.data[0]
    await save_turn(user, chat["id"], body.question, reply)
    return {"chat_id": chat["id"], "question": body.question, **reply}


@router.post("/{chat_id}/messages")
async def follow_up(chat_id: str, body: FollowUpIn, user: User = Depends(get_user)):
    res = await user.db.table("chats").select("id, theme_ids, log_ids").eq("id", chat_id).execute()
    if not res.data:
        raise HTTPException(404, "Chat not found")
    chat = res.data[0]
    msgs = await (
        user.db.table("chat_messages").select("role, text").eq("chat_id", chat_id)
        .order("created_at", desc=True).limit(settings.chat_history_turns * 2).execute()
    )
    reply = await answer(user, body.question, chat["theme_ids"], chat["log_ids"], msgs.data[::-1])
    await save_turn(user, chat_id, body.question, reply)
    await user.db.table("chats").update({"updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", chat_id).execute()
    return {"chat_id": chat_id, "question": body.question, **reply}


@router.get("")
async def list_chats(user: User = Depends(get_user)):
    res = await user.db.table("chats").select("id, title, theme_ids, log_ids, updated_at").order("updated_at", desc=True).execute()
    return res.data


@router.get("/{chat_id}")
async def get_chat(chat_id: str, user: User = Depends(get_user)):
    res = await user.db.table("chats").select("id, title, theme_ids, log_ids, created_at, updated_at").eq("id", chat_id).execute()
    if not res.data:
        raise HTTPException(404, "Chat not found")
    msgs = await user.db.table("chat_messages").select("role, text, citations, created_at").eq("chat_id", chat_id).order("created_at").execute()
    return {**res.data[0], "messages": msgs.data}
