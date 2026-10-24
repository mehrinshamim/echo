# Echo backend

FastAPI + Supabase (Postgres, pgvector, auth). Schema: `../supabase/schema.sql`.

## Setup
```bash
cp .env.example .env   # fill in Supabase URL + anon key, LLM settings
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Test auth (/me)
1. Supabase dashboard -> Authentication -> Users -> Add user (tick Auto Confirm User).
2. Get a token and call the API:
```bash
SUPABASE_URL=https://YOUR-REF.supabase.co
ANON=your-anon-key

TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"your-password"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -s localhost:8000/me -H "Authorization: Bearer $TOKEN"
```
Expected: `{"user_id":"<uuid>"}`. A bad token gives 401 `Invalid or expired token`; no header gives 401 `Missing bearer token`. Tokens expire after 1 hour.

## Test entries (needs a real LLM key in .env)
```bash
post() { curl -s localhost:8000/entries -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$1"; echo; }

post '{"transcript":"I keep wondering if I should quit my job to build my own product. The salary is safe but I feel stuck.", "created_at":"2026-09-01T09:00:00Z"}'
post '{"transcript":"Talked to a founder today. Starting a company sounds lonely, maybe I am romanticising leaving my job.", "created_at":"2026-09-20T09:00:00Z"}'
post '{"transcript":"Made pasta from scratch for the first time. Too much flour but it was fun."}'
post '{"transcript":"Still thinking about leaving work to build something. I think fear, not money, is what holds me back."}'

curl -s localhost:8000/entries -H "Authorization: Bearer $TOKEN"
```
Expected: the career entries share a theme, the pasta entry gets its own, and the last entry returns `echoes` pointing at the September entries. If echoes are empty, lower `ECHO_THRESHOLD` in .env (default 0.75).
