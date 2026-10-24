"""Load demo logs through the real API, print similarity numbers, and warm theme reports.

Usage (backend running):
  SEED_EMAIL=you@example.com SEED_PASSWORD=... uv run python -m scripts.seed [--wipe] [--api http://localhost:8000]

--wipe deletes this user's logs, themes, reports and chats first (needed after changing EMBED_PROVIDER).
"""

import argparse
import asyncio
import json
import os
from pathlib import Path

import httpx
from supabase import acreate_client

from app.config import settings

SEED_FILE = Path(__file__).parent / "seed_logs.json"


async def main(api: str, wipe: bool) -> None:
    db = await acreate_client(settings.supabase_url, settings.supabase_anon_key)
    session = await db.auth.sign_in_with_password({"email": os.environ["SEED_EMAIL"], "password": os.environ["SEED_PASSWORD"]})
    headers = {"Authorization": f"Bearer {session.session.access_token}"}

    if wipe:
        for table in ["chats", "theme_reports", "themes", "entries"]:  # chunks and links cascade
            await db.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("wiped")

    async with httpx.AsyncClient(base_url=api, headers=headers, timeout=180) as http:
        for log in json.loads(SEED_FILE.read_text()):
            r = await http.post("/logs", json=log)
            r.raise_for_status()
            d = r.json()
            print(f"{d['created_at'][:10]}  {d['title'][:45]:45}  themes={[t['name'] for t in d['themes']]}  related={len(d['related'])}")

        # Calibration: raw similarity of each log to its closest other logs (no threshold applied)
        print("\nnearest-neighbour similarities (tune ECHO_THRESHOLD between related and unrelated):")
        rows = await db.table("entries").select("id, title, embedding").order("created_at").execute()
        for row in rows.data:
            m = await db.rpc("match_entries", {"query_embedding": row["embedding"], "match_count": 3, "exclude_id": row["id"]}).execute()
            print(f"  {row['title'][:40]:40}  " + "  ".join(f"{x['similarity']:.2f} {x['title'][:20]}" for x in m.data))

        # Warm the evolution report cache for the demo
        themes = (await http.get("/themes")).json()
        for t in themes:
            if t["log_count"] >= 2:
                r = await http.get(f"/themes/{t['id']}/report")
                print(f"report  {t['name']:25} {t['log_count']} logs  {r.json().get('status')}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--api", default="http://localhost:8000")
    p.add_argument("--wipe", action="store_true")
    a = p.parse_args()
    asyncio.run(main(a.api, a.wipe))
