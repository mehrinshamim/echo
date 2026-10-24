# Echo API guide for the app

Everything the app needs to talk to the backend: setup, auth, which endpoint each screen calls, exact request/response shapes, TypeScript types, timings and errors. Screen IDs (S01–S18, SH1, SH2) are from `ui-ux-flow-for-backend.md`.

---

## 1. Setup

| | Value |
|---|---|
| Base URL (dev) | `http://<laptop-LAN-IP>:8000` (phone and laptop on the same Wi-Fi; backend started with `--host 0.0.0.0`) |
| Base URL (deployed) | `https://<render-service>.onrender.com` (first request after idle can take ~30 s while it wakes) |
| Format | JSON in, JSON out. Dates are ISO 8601 UTC strings; group by local day on the phone. |
| Auth | `Authorization: Bearer <access_token>` on every request except `GET /health` |

Put the base URL in one config constant (no hardcoded URLs in screens).

### Auth (S02)
1. Sign in with Google through the Supabase JS SDK (`supabase.auth.signInWithOAuth({ provider: 'google' })`, or the native Google flow + `signInWithIdToken`).
2. Get the token: `const { data } = await supabase.auth.getSession(); data.session.access_token`.
3. Send it on every call. The SDK refreshes it; read it fresh before each request (tokens last 1 hour).
4. `GET /me` → `{"user_id": "uuid"}` is a quick "am I signed in?" check.

### Minimal client
```ts
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
      ...init.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).detail);
  return res.json();
}
```

---

## 2. Errors and timings

| Status | Meaning | App should |
|---|---|---|
| 401 | Missing or expired token | Refresh session / send to sign in |
| 404 | Not found (or belongs to another user) | Go back, show "not found" |
| 400 | Action not possible (e.g. analyze with no new pieces) | Show `detail` |
| 422 | Body didn't match the shape below | Bug in the request |
| 500 | LLM or database failure (dev: Gemini free tier rate limit when calls are rapid) | Show a retry button |

Error body: `{"detail": "message"}`.

| Call | Typical time | UI |
|---|---|---|
| `POST /logs` | 2–6 s | S05 "Listening back" checklist |
| `GET /themes/{id}/report` | 5–15 s first time, instant when cached | Skeleton / spinner on "How it changed" |
| `POST /chats`, follow-ups | 2–5 s ("not in your journal" is instant) | Typing indicator |
| `POST /styles/analyze` | 10–30 s | S15 "Reading how you write" |
| `POST /drafts`, revise, restyle | 5–15 s | Spinner in the editor |
| Everything else | < 1 s | — |

No streaming: each call returns the finished result.

---

## 3. Screen → endpoint map

| Screen | Calls |
|---|---|
| S02 Sign in | Supabase SDK, then `GET /me` |
| S03 Home | `GET /home` |
| S04 Capture | none (on-device) |
| S05 Listening back | `POST /logs` |
| S06 Log result | `GET /logs/{id}`, `POST /logs/{id}/themes`, `DELETE /logs/{id}/themes/{theme_id}` |
| S07 Write a log | `POST /logs` (`source: "typed"` or `"mixed"`, with `title`) |
| S08 Logs list | `GET /logs?q=&before=` |
| S09 Theme | `GET /themes/{id}`, `GET /themes/{id}/report` |
| "View all" themes | `GET /themes` |
| S10 New chat | `POST /chats` |
| S11 Cited answer | `POST /chats/{id}/messages`, `GET /logs/{log_id}` on citation tap |
| Chats count / history | `GET /chats`, `GET /chats/{id}` |
| S12 Write home | `GET /styles`, `GET /drafts?status=draft|saved|published` |
| S13 Draft editor | `GET /drafts/{id}`, `PUT /drafts/{id}`, `POST /drafts/{id}/revise`, `POST /drafts/{id}/restyle`, `POST /drafts/{id}/save` |
| S14 Add your writing | `POST /pieces`, `GET /pieces`, `DELETE /pieces/{id}` |
| S15 Analyzing | `POST /styles/analyze` |
| S16 Your styles | `GET /styles`, `POST /styles/merge` |
| S17 Style detail | `GET /styles/{id}`, `PATCH /styles/{id}`, `PATCH /pieces/{id}` |
| S18 New post | `POST /drafts` |
| SH1 Style picker | `GET /styles` (pick → `style_id`; "Let Echo choose" → `style_id: null`) |
| SH2 Finish | `POST /drafts/{id}/publish` |

Not provided by the API (keep in the app): Ask suggestions (S10), post ideas (S18), nudge dismissal, "Keep separate" on a merge suggestion, weekly summary (hide it), file (.docx/.pdf) and link import (read .md/.txt on the phone and send the text).

---

## 4. Endpoints

### Logs

**`POST /logs`** — save a log (S05, S07)
```json
// request
{
  "text": "full transcript or typed body (required, max 20,000 chars)",
  "title": null,          // typed logs only; otherwise generated
  "duration_s": 74,       // voice capture length; null for typed
  "source": "voice"       // "voice" | "typed" | "mixed" (typed + appended capture)
}
// response: Log + steps
{
  "id": "uuid",
  "title": "Small bugs are the real on-ramp",
  "created_at": "2026-10-24T09:40:00+00:00",
  "duration_s": 74,
  "source": "voice",
  "transcript": "...",
  "word_count": 182,
  "summary": "You ...",
  "key_points": ["...", "...", "..."],
  "stance": "...",
  "themes": [{ "id": "uuid", "name": "Open Source" }],
  "related": [
    { "log_id": "uuid", "date": "2026-08-12T22:30:00+00:00", "title": "...", "theme": "Imposter Syndrome",
      "snippet": "...", "similarity": 0.81 }
  ],
  "steps": { "themes_added": 2, "related_found": 2 }   // S05 checklist lines 3 and 4
}
```
Edit the transcript (misheard names) in the app **before** sending; the server doesn't change it afterwards.

**`GET /logs?q=&before=`** — list (S08). Newest first, 50 per page.
- `q`: keyword search in title + transcript.
- `before`: `created_at` of the last item you have, for the next page.
```json
[
  { "id": "uuid", "title": "...", "created_at": "...", "duration_s": 74, "source": "voice",
    "primary_theme": { "id": "uuid", "name": "Open Source" } }    // or null
]
```
Show "typed" when `source` is `"typed"`.

**`GET /logs/{id}`** — detail (S06). Same as the POST response without `steps`.

**`PATCH /logs/{id}`** `{"title": "New title"}` → Log
**`POST /logs/{id}/themes`** `{"name": "Imposter Syndrome"}` → Log (reuses a theme with that name or creates it)
**`DELETE /logs/{id}/themes/{theme_id}`** → Log

### Home

**`GET /home`** (S03)
```json
{
  "counts": { "logs": 18, "themes": 5, "chats": 2 },
  "themes": [   // top 6, most recent activity first
    { "id": "uuid", "name": "Open Source", "description": "...", "log_count": 7,
      "first_log_at": "...", "last_log_at": "..." }
  ],
  "nudge": {    // or null
    "theme_id": "uuid", "theme_name": "Imposter Syndrome", "count": 3,
    "window": "this week", "message": "You've come back to this 3 times this week."
  }
}
```
Card meta "7 logs · 2d ago" = `log_count` + `last_log_at`.

### Themes

**`GET /themes`** → array of the same theme items as `home.themes` (all of them).

**`GET /themes/{id}`** (S09 header + All logs)
```json
{
  "id": "uuid", "name": "Imposter Syndrome", "description": "...", "log_count": 7,
  "first_log_at": "...", "last_log_at": "...",       // "May to October"
  "logs": [{ "id": "uuid", "title": "...", "created_at": "...", "duration_s": 70, "source": "voice" }]
}
```

**`PATCH /themes/{id}`** `{"name": "..."}` → theme item

**`GET /themes/{id}/report`** (S09 How it changed)
```json
{
  "status": "ok",                // or "not_enough_history" (fewer than 2 logs; report is null)
  "cached": true,
  "log_count": 7,
  "report": {
    "overview": "You ...",
    "then": { "quote": "Real contributors are a different kind of person.", "log_id": "uuid", "date": "...", "title": "..." },
    "now":  { "quote": "Small contributions count.", "log_id": "uuid", "date": "...", "title": "..." },
    "shifts": [{ "text": "You ...", "log_id": "uuid", "date": "...", "title": "..." }],   // "What changed", oldest first
    "open_question": "Does this hold for job interviews, or just open source?"           // "Still open"
  }
}
```
"Then · May" = month of `then.date`. Tap a shift → `GET /logs/{log_id}`. "Answer out loud" → open S04; the app can show `open_question` as the prompt.

### Chats (Ask)

**`POST /chats`** — new chat with the first question (S10 → S11)
```json
// request
{ "question": "What did I learn at hackathons?", "theme_ids": ["uuid"], "log_ids": [] }
// response
{
  "chat_id": "uuid",
  "question": "What did I learn at hackathons?",
  "text": "You learned to scope down early [1] and that judges care about the demo [2].",
  "supported": true,
  "citations": [
    { "n": 1, "log_id": "uuid", "title": "...", "date": "...", "snippet": "..." }
  ]
}
```
- Render `[n]` in `text` as pills; tap → `GET /logs/{citation.log_id}`. "From your logs" list = `citations`.
- `supported: false` → `text` is "That isn't in your journal yet." and `citations` is empty.
- Context chips: `theme_ids` (only the first one filters), `log_ids` ("Ask about this" from S06 → `[logId]`).

**`POST /chats/{chat_id}/messages`** `{"question": "..."}` → same shape (follow-up, keeps the chat's chips)
**`GET /chats`** → `[{ "id", "title", "theme_ids", "log_ids", "updated_at" }]` (newest first; Home count)
**`GET /chats/{chat_id}`** → `{ "id", "title", "theme_ids", "log_ids", "created_at", "updated_at", "messages": [{ "role": "user"|"assistant", "text", "citations", "created_at" }] }`

### Writing pieces and styles

**`POST /pieces`** — add writing (S14 Paste / File)
```json
// request: 1–20 items, each up to 20,000 chars
{ "items": [{ "text": "...", "title": null, "source_label": "Pasted" }] }   // source_label e.g. "Pasted", "talk-notes.md"
// response: the new pending pieces
[{ "id": "uuid", "style_id": null, "title": "first 40 chars...", "source": "pasted",
   "source_label": "Pasted", "word_count": 220, "created_at": "..." }]
```
**`GET /pieces`** → pending pieces (not analyzed yet), for the "Added · N pieces" list
**`DELETE /pieces/{id}`** → `{"ok": true}`

**`POST /styles/analyze`** (S15 → S16). 400 if there are no pending pieces.
```json
{
  "pieces_read": 4,
  "styles": [Style, ...],                 // all styles, newest first
  "merge_suggestion": { "a": "style-uuid", "b": "style-uuid", "reason": "Both open with something you admit..." }   // or null
}
```

**`GET /styles`** (S12, S16, SH1)
```json
[{ "id": "uuid", "name": "Reflective LinkedIn", "traits": ["Opens with something you admit", "Short lines, one idea each", "Ends with one piece of advice"],
   "sample": "I almost didn't write any code at the hackathon.", "where_used": "mostly LinkedIn",
   "updated_at": "...", "piece_count": 6 }]
```

**`GET /styles/{id}`** (S17) → Style + `"profile": {...}` (full voice profile, optional to show) + `"pieces": [Piece]`
**`PATCH /styles/{id}`** `{"name": "..."}` → style detail
**`POST /styles/merge`** `{"keep_id": "uuid", "merge_id": "uuid"}` → kept style detail (pieces move over; the other style is deleted; no undo)
**`PATCH /pieces/{id}`** `{"style_id": "uuid"}` → Piece ("Move")

### Drafts

**`POST /drafts`** — generate a post (S18 send / idea, S06 or S11 "Make a post")
```json
// request
{
  "prompt": "A LinkedIn post about the Wikimedia hackathon",
  "style_id": null,           // null = "Let Echo choose"
  "log_ids": ["uuid"],        // "+ Log" chips / the log or citations it came from
  "theme_ids": [],            // a theme brings in its 5 most recent logs
  "kind": "linkedin"          // "linkedin" | "blog" | "story"
}
// response: Draft + why
```

**Draft shape** (`GET /drafts/{id}`, and every draft action below)
```json
{
  "id": "uuid", "kind": "linkedin", "title": "Small bugs are the real on-ramp",
  "text": "the post",
  "prompt": "A LinkedIn post about...",
  "style_id": "uuid", "style_name": "Reflective LinkedIn",
  "source_log_ids": ["uuid"],
  "source_logs": [{ "id": "uuid", "title": "...", "created_at": "..." }],   // "Built from"
  "status": "draft",           // "draft" | "saved" | "published"
  "version": 3,                // "v3"
  "char_limit": 3000,          // 280 for "story"; footer "N / 3000"
  "platform": null, "url": null,
  "created_at": "...", "updated_at": "...", "saved_at": null, "published_at": null
}
```
`POST /drafts` also returns `"why"`: 2 sentences on the hook and structure (optional to show).

**`GET /drafts?status=draft|saved|published`** (S12 tabs) → list of drafts with `style_name` and `log_count` (no `source_logs`)
**`PUT /drafts/{id}`** `{"text": "..."}` → Draft (manual edit = new version; debounce autosave ~2 s; label Edited → Saved on response)
**`POST /drafts/{id}/revise`** → Draft (new version)
```json
{ "instruction": "Shorter" }                                        // chips: Shorter, Stronger hook, More casual, End with a question
{ "instruction": "Make this punchier", "selection": { "start": 120, "end": 245 } }   // only that span (character offsets in text)
```
**`POST /drafts/{id}/restyle`** `{"style_id": "uuid"}` → Draft (style chip switch: regenerated, new version)
**`GET /drafts/{id}/versions`** → `[{ "n", "text", "author": "ai"|"user", "instruction", "created_at" }]` (for the History button)
**`POST /drafts/{id}/save`** → Draft with `status: "saved"` (Save for later)
**`POST /drafts/{id}/publish`** `{"platform": "linkedin"|"blog"|"other", "url": null}` → Draft with `status: "published"` (SH2; the post is also added to its style as a piece, "Added to your styles")

"Mark published" from the Saved tab: call the same publish endpoint (send `platform`, default `"linkedin"`).

---

## 5. TypeScript types

```ts
type ThemeRef = { id: string; name: string };

type Log = {
  id: string; title: string; created_at: string; duration_s: number | null;
  source: 'voice' | 'typed' | 'mixed'; transcript: string; word_count: number;
  summary: string; key_points: string[]; stance: string; themes: ThemeRef[];
  related: { log_id: string; date: string; title: string; theme: string | null; snippet: string; similarity: number }[];
};
type SavedLog = Log & { steps: { themes_added: number; related_found: number } };
type LogListItem = { id: string; title: string; created_at: string; duration_s: number | null; source: Log['source']; primary_theme: ThemeRef | null };

type Theme = { id: string; name: string; description: string | null; log_count: number; first_log_at: string | null; last_log_at: string | null };
type ThemeDetail = Theme & { logs: { id: string; title: string; created_at: string; duration_s: number | null; source: Log['source'] }[] };
type Home = { counts: { logs: number; themes: number; chats: number }; themes: Theme[];
  nudge: { theme_id: string; theme_name: string; count: number; window: string; message: string } | null };

type Cite = { log_id: string; date: string; title: string };
type ReportResponse = { status: 'ok' | 'not_enough_history'; cached?: boolean; log_count: number;
  report: { overview: string; then: Cite & { quote: string }; now: Cite & { quote: string };
            shifts: (Cite & { text: string })[]; open_question: string } | null };

type Citation = { n: number; log_id: string; title: string; date: string; snippet: string };
type Answer = { chat_id: string; question: string; text: string; supported: boolean; citations: Citation[] };

type Piece = { id: string; style_id: string | null; title: string; source: 'pasted' | 'file' | 'link' | 'published'; source_label: string; word_count: number; created_at: string };
type Style = { id: string; name: string; traits: string[]; sample: string | null; where_used: string | null; updated_at: string; piece_count: number };
type StyleDetail = Style & { profile: Record<string, unknown>; pieces: Piece[] };
type Analysis = { pieces_read: number; styles: Style[]; merge_suggestion: { a: string; b: string; reason: string } | null };

type Draft = {
  id: string; kind: 'linkedin' | 'blog' | 'story'; title: string; text: string; prompt: string | null;
  style_id: string | null; style_name: string | null; source_log_ids: string[];
  source_logs: { id: string; title: string; created_at: string }[];
  status: 'draft' | 'saved' | 'published'; version: number; char_limit: number;
  platform: string | null; url: string | null;
  created_at: string; updated_at: string; saved_at: string | null; published_at: string | null;
};
```

---

## 6. Demo data

The backend team seeds ~18 realistic logs (themes like Imposter Syndrome, Open Source, Hackathons, Building in Public, Career Growth) into the demo account, so Home, Logs, Themes, reports and Ask have content without recording anything. Ask the backend team to run the seed for your test account.

## 7. Known limits

- Theme names come from the model, so casing can vary ("Open Source" vs "Open source").
- Only the first theme chip filters Ask.
- No undo for style merge; no delete for logs, themes or styles yet.
- Dev runs on Gemini's free tier: rapid repeated calls can hit its per-minute limit and return 500; retry after a few seconds.
