"""Home screen (S03): counts, top themes, and the 'Echo noticed' nudge. Plain SQL, no LLM."""

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.config import settings
from app.deps import User, get_user

router = APIRouter(tags=["home"])


async def count(user: User, table: str) -> int:
    res = await user.db.table(table).select("id", count="exact").limit(1).execute()
    return res.count or 0


@router.get("/home")
async def home(user: User = Depends(get_user)):
    stats = await user.db.rpc("theme_stats", {}).execute()
    themes = [t for t in stats.data if t["log_count"] > 0]

    # Nudge: the theme the user came back to most in the last few days
    since = datetime.now(timezone.utc) - timedelta(days=settings.nudge_window_days)
    recent = await user.db.table("entries").select("id, themes(id, name)").gte("created_at", since.isoformat()).execute()
    counts = Counter((t["id"], t["name"]) for r in recent.data for t in r["themes"])
    nudge = None
    if counts:
        (theme_id, name), n = counts.most_common(1)[0]
        if n >= settings.nudge_min_logs:
            nudge = {
                "theme_id": theme_id,
                "theme_name": name,
                "count": n,
                "window": "this week" if settings.nudge_window_days == 7 else f"the last {settings.nudge_window_days} days",
                "message": f"You've come back to this {n} times this week.",
            }

    return {
        "counts": {
            "logs": await count(user, "entries"),
            "themes": len(themes),
            "chats": await count(user, "chats"),
        },
        "themes": themes[: settings.home_theme_count],
        "nudge": nudge,
    }
