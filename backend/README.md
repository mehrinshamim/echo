# Echo backend

FastAPI + Supabase (Postgres, pgvector, auth). Schema: `supabase/schema.sql`.

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

## Database
Run `supabase/schema.sql`, then every file in `supabase/migrations/` in order, in the Supabase SQL editor.

## Seed demo data
With the server running:
```bash
SEED_EMAIL=you@example.com SEED_PASSWORD=... uv run python -m scripts.seed          # add --wipe to start clean
```
Loads ~18 backdated logs, prints nearest-neighbour similarities (use them to set `ECHO_THRESHOLD` and
`ASK_MIN_SIMILARITY` in .env), and pre-generates the theme reports.

## Test everything
Open `../bruno` in Bruno (environment Local), run `1 Login`, then any request. Endpoint contract: `API.md`.
Architecture: `ARCHITECTURE.md`. Raw LLM replies are logged to `logs/llm.log`.
