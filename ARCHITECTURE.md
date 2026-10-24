# Echo architecture

How Echo works end to end: what runs where, what happens on each user action, how the data is stored, and why it is built this way. Status markers: **[built]** = code exists, **[built]** = in the current build plan, **[cut]** = not in the hackathon build.

---

## 1. The big picture

```
┌──────────────────────────── Phone (Expo / React Native) ────────────────────────────┐
│  Mic ──► recorder.ts (raw PCM) ──► transcribe.ts (whisper.rn, base.en, on-device)     │
│                                         │  audio never leaves the phone              │
│  Screens (Home, Capture, Log, Theme, Ask, Write) ◄──── JSON ────┐                    │
│  Supabase Auth SDK (Google sign-in) ──► access token (JWT)       │                    │
└───────────────────────────────┬──────────────────────────────────┼────────────────────┘
                                │ HTTPS + "Authorization: Bearer <JWT>", text only
                                ▼                                  │
┌──────────────────────────── Backend (FastAPI, Python, async) ────┴────────────────────┐
│  deps.get_user: check JWT with Supabase ─► per-request DB client acting as that user  │
│  routes/: logs · home · themes · chats · styles · drafts                              │
│  llm.py: chat_json() + embed()  ◄── the only code that talks to AI providers          │
│  prompts.py: every prompt         config.py: every setting, model name, limit         │
└──────────────┬─────────────────────────────────────────────┬──────────────────────────┘
               │ SQL / RPC (row-level security applies)      │ OpenAI-compatible HTTP
               ▼                                             ▼
┌──────── Supabase ─────────────────────┐     ┌──────── AI providers ─────────────────┐
│ Auth (users, Google login, JWTs)      │     │ Gemini  (free tier: dev chat + embed) │
│ Postgres: logs, themes, chats, ...    │     │ OpenAI  (demo chat + embeddings)      │
│ pgvector: embeddings + HNSW indexes   │     │ Groq    (backup chat, no embeddings)  │
│ SQL functions: match_chunks/entries   │     └───────────────────────────────────────┘
└───────────────────────────────────────┘
```

Three ideas drive the design:
1. **Voice stays on the phone.** Transcription runs on-device (whisper.cpp). The server only ever sees text.
2. **One database for everything.** Auth, app data and vectors all live in Supabase Postgres, so there is no second store to keep in sync.
3. **Fixed pipelines, not agents.** Every feature is "load data → 1–2 structured LLM calls → save". That is predictable, cheap and easy to debug.

---

## 2. User flows, traced through the system

Screen IDs (S03, S06, ...) refer to `ui-ux-flow-for-backend.md`.

### F1 Sign in (S01–S02) [app + Supabase; backend needs nothing new]
```
App ── Google sign-in via Supabase Auth SDK ──► Supabase returns a session (access token, 1 h, auto-refreshed)
App ── every API call: Authorization: Bearer <token> ──► FastAPI
FastAPI deps.get_user ── "who is this?" ──► Supabase Auth ──► user id
```

### F2 Capture a log by voice (S04 → S05 → S06) [built]
```
S04  record + transcribe on the phone (no network)
S05  POST /logs {text, duration_s, source:"voice"}
       1. in parallel:
          a. FAST LLM call: title, summary, key points, stance, 1–3 themes
             (it is shown the user's existing themes and told to reuse them)
          b. split transcript into ~250-word chunks and embed them
       2. embed the summary (+ any new theme names)
       3. save the log and its chunks
       4. themes: same name → reuse; else very similar meaning (embedding ≥ 0.85) → reuse; else create
       5. related logs: vector search over older logs' summary embeddings ("you said this before")
     ◄── {log, themes, related, steps:{themes_added, related_found}}  → S05 ticks, S06 opens
S06  Transcript / Summary / Related tabs read from that response or GET /logs/{id}
```

### F3 Type a log (S07) [built]
Same `POST /logs` with `source:"typed"` (or `"mixed"` when speech was appended) and the user's own title.

### F4 Browse (S03 Home, S08 Logs, S09 Theme) [built]
```
S03  GET /home     → counts (logs, themes, chats), top 6 themes, "Echo noticed" nudge
                     nudge = a theme with 3+ logs in the last 7 days (plain SQL, no LLM)
S08  GET /logs?q=  → newest first, keyword search on title + transcript, paged with ?before=
S09  GET /themes/{id}         → theme + its logs
     GET /themes/{id}/report  → evolution report (see section 5)
```

### F5 Ask (S10 → S11) [built]
```
POST /chats {question, theme_ids?, log_ids?}
  1. embed the question
  2. match_chunks: the 8 closest transcript chunks (optionally only within a theme / chosen logs)
  3. nothing close enough? → "That's not in your journal" (no LLM call, instant)
  4. FAST LLM: answer ONLY from the numbered excerpts, cite as [1] [2]
  5. server maps [n] → real log ids, drops any number it never gave
◄── {text, citations:[{n, log_id, title, date}]}   follow-ups: POST /chats/{id}/messages
```

### F6 Upload writing → styles (S14 → S15 → S16/S17) [built]
```
POST /pieces {items:[{text, title, source_label}]}   pasted or .md/.txt text, saved as "pending"
POST /styles/analyze
  one SMART LLM call over the pending pieces + existing styles →
  assign each piece to an existing or new style; for each style: name, 3 traits,
  a sample line, where it's used, a voice profile; optionally "these two read alike"
GET /styles, GET /styles/{id}, rename, merge, move a piece
```

### F7 Create, edit, publish a post (S18 → S13 → SH2 → S12) [built]
```
POST /drafts {prompt, style_id | auto, log_ids, theme_ids}
  auto style → FAST call picks the closest style
  SMART call: source logs + related chunks + style profile + 2 example pieces
              rules: keep the user's own words and claims, invent nothing, respect the char limit
  ◄── draft v1
PUT  /drafts/{id} {text}                 manual edit → new version
POST /drafts/{id}/revise {instruction}   "Shorter", "Stronger hook", ... → new version
POST /drafts/{id}/save                   → Saved tab
POST /drafts/{id}/publish {platform,url} → Published tab + the post becomes a new piece in its style
```

---

## 3. Backend components

| File | Job | Status |
|---|---|---|
| `backend/app/main.py` | Creates the app, CORS, mounts routers, `/health`, `/me` | built |
| `backend/app/config.py` | Every setting from `.env`: Supabase, providers, models, thresholds, limits | built |
| `backend/app/deps.py` | `get_user`: verifies the JWT, returns a DB client that acts as that user | built |
| `backend/app/llm.py` | `chat_json()` (structured JSON output, validated) and `embed()` | built |
| `backend/app/prompts.py` | All prompt text | built (grows per feature) |
| `backend/app/routes/logs.py` | Save/list/search/read logs, edit title and themes | built |
| `backend/app/routes/home.py` | Counts, top themes, nudge | built |
| `backend/app/routes/themes.py` | Theme list/detail, rename, evolution report | built |
| `backend/app/routes/chats.py` | Ask with citations, chat history | built |
| `backend/app/routes/styles.py` | Pieces, style analysis, style management | built |
| `backend/app/routes/drafts.py` | Generate, edit, revise, save, publish posts | built |
| `supabase/schema.sql` | Tables, row-level security, vector indexes, search functions | built (+ `migrations/002_ui.sql`) |
| `backend/scripts/seed.py` | Loads ~18 realistic backdated logs for the demo | built |
| `bruno/` | Click-to-run API requests for testing | built |
| `backend/API.md` | Endpoint contract for the app team | built |

---

## 4. Data model

```
auth.users ─┬─< entries (logs) ─┬─< chunks            (transcript pieces + embedding, for Ask)
            │                   └─< entry_themes >─┐
            ├─< themes ─────────────────────────────┘── theme_reports (1 cached report per theme)
            ├─< chats ──< chat_messages             (answers + citations)
            ├─< styles ──< pieces                   (uploaded or published writing)
            └─< drafts ──< draft_versions           (every AI or manual change)
```

| Table | What it holds |
|---|---|
| `entries` (API name: logs) | transcript, title, summary, key points, stance, duration, source, summary **embedding**, created_at |
| `chunks` | ~250-word transcript pieces with their **embedding** (used by Ask) |
| `themes` | name, description, last activity, name+description **embedding** (used to avoid duplicate themes) |
| `entry_themes` | which logs belong to which themes (many-to-many, with confidence) |
| `theme_reports` | cached evolution report + a hash of the theme's log ids (changes → regenerate) |
| `chats`, `chat_messages` | conversations, answers, citations |
| `styles`, `pieces` | writing styles and the pieces of writing grouped into them |
| `drafts`, `draft_versions` | posts (draft / saved / published) and their full history |

Every table has `user_id` and a row-level security rule `user_id = auth.uid()`.

---

## 5. How the "smart" parts work

**Embeddings.** An embedding turns text into 768 numbers that capture its meaning; texts about the same thing get vectors pointing the same way. Similarity = cosine (1 = same meaning). Stored in pgvector columns with HNSW indexes so search stays fast.

**Two kinds of vectors.**
- Log *summary* embeddings find similar logs (Related tab, nudges).
- Transcript *chunk* embeddings answer questions, because exact wording matters there.

**Chunking.** Transcripts are cut into ~250-word pieces on sentence boundaries, overlapping by ~40 words so an idea split across a boundary still appears whole somewhere.

**Theme reuse.** The LLM sees existing theme names and is told to reuse them. As a safety net the server also compares a new theme's meaning with existing ones and merges near-duplicates ("job anxiety" vs "career worries").

**Evolution report.** All of a theme's logs in date order, labelled E1…En, go to the SMART model in one call. It returns then/now quotes, dated shifts and an open question, citing E-labels. The server maps labels back to real log ids and drops any it doesn't recognise, so citations can't be invented. The result is cached until the theme's set of logs changes.

**Cited answers.** Retrieval first, then a FAST model that may only use the numbered excerpts. If retrieval finds nothing close, the server answers "not in your journal" without calling the model at all.

**Styles and drafts.** Pieces are grouped into styles by one SMART call that also writes each style's traits and voice profile. Drafts are generated from the user's own logs in a chosen style; revisions create new versions; published posts flow back into the style.

**FAST vs SMART.** FAST = cheap, quick model for frequent jobs (every log, every question). SMART = stronger model for rare, quality-critical jobs (reports, styles, drafts). Both are names in `.env`, so models can be swapped without code changes.

**Structured output.** Every LLM call must return JSON matching a schema. The server validates it, retries once, falls back to a looser JSON mode for providers that don't support strict schemas, and can retry on a backup provider.

---

## 6. Security

```
token ──► Supabase verifies ──► DB client created with that same token ──► Postgres RLS: user_id = auth.uid()
```
- The backend never uses the all-powerful service-role key in requests; it acts as the user, so the database itself refuses other users' rows.
- Secrets live in `backend/.env` (git-ignored). Audio never leaves the phone.

---

## 7. What we used and why

| Choice | Instead of | Why |
|---|---|---|
| On-device whisper.cpp (whisper.rn, base.en) | Hosted Whisper API | Private (audio stays on phone), no per-call cost; tested at 43 s audio → 3.4 s |
| Expo / React Native | Kotlin | Same speed for transcription (C++ engine), much faster to build screens |
| FastAPI (async) | Node, Django | Python is best for LLM/embedding work; async handles slow AI calls well |
| Supabase (Auth + Postgres + pgvector) | Separate vector DB (FAISS, Pinecone, Qdrant) | One place for users, data and vectors; RLS gives per-user privacy for free |
| Plain async pipelines | Agent frameworks (LangChain/LangGraph) | Features are fixed steps, not open-ended tool loops; agents add latency, cost, unpredictability |
| Postgres themes + vectors | Cognee (knowledge-graph memory) | Cognee would add a second store and auth model and make citations harder; it only helps "how do X and Y relate" questions. Revisit after the hackathon |
| Hosted embeddings (Gemini now, OpenAI planned) | Local MiniLM | No PyTorch on a low-RAM laptop or server; MiniLM cuts text at 256 tokens and is weaker |
| OpenAI-compatible client for all providers | One SDK per provider | Switch Gemini / OpenAI / Groq by editing `.env` |
| Render | Neysa | Render hosts a small web app from GitHub in minutes; Neysa is a GPU AI cloud |
| Bruno | curl / Postman | Click-to-run, saves the login token automatically, collection lives in git |

More detail on each decision: `doc-ignore/why.md`.

---

## 8. Status and known limits

**Built (code):** everything in sections 2–3: auth, logs pipeline with theme reuse and related logs, home + nudge, themes + cached evolution report, chats with validated citations, styles (pieces, analysis, merge), drafts (generate, edit, revise, restyle, save, publish, versions), seed script, Render blueprint, API contract, Bruno collection.
**Verified live:** Gemini `gemini-3.5-flash-lite` returns valid strict JSON in ~2 s; Gemini embeddings return 768 dims; server starts and all routes reject missing tokens.
**Not yet verified live:** the endpoints against the real database (needs `migrations/002_ui.sql` run first), Render deploy.
**Cut for the hackathon:** weekly summary, file (.docx/.pdf) and link import, merge undo, account delete-all, streaming responses, offline queue.
**Known limits:** report cache is keyed on the set of logs (editing a log's text doesn't refresh it); only the first theme chip filters Ask retrieval; similarity thresholds need tuning on seed data; Gemini free tier is slow/rate-limited for SMART models, so the demo should run on OpenAI or a fast paid model.
