# Echo API contract

For the app team. Screen IDs (S03, S06, ...) are from `ui-ux-flow-for-backend.md`.

- **Base URL:** local `http://<laptop-LAN-IP>:8000`, deployed `https://<render-service>.onrender.com`.
- **Auth:** every endpoint except `/health` needs `Authorization: Bearer <supabase access_token>`. Get it from the Supabase JS SDK after Google sign-in (`supabase.auth.getSession()`); the SDK refreshes it.
- **Errors:** `{"detail": "..."}` with 401 (missing/expired token), 404 (not found or not yours), 422 (bad body), 500/502 (LLM or DB failure; show a retry).
- **Dates:** ISO 8601 UTC strings. Group by local day on the phone.
- **Status:** ✅ built · 🚧 coming in this build.

---

## Logs

### ✅ `POST /logs` (S05 save pipeline; S07 typed save)
Takes 2–6 s (LLM + embeddings). Show S05 while waiting; tick steps 2–4 from `steps` when it returns.
```json
// request
{"text": "full transcript or typed body", "title": null, "duration_s": 74, "source": "voice"}
// source: "voice" | "typed" | "mixed" (typed + appended capture). title: only for typed logs.

// response (same shape as GET /logs/{id})
{
  "id": "uuid", "title": "Small bugs are the real on-ramp", "created_at": "2026-10-24T09:40:00+00:00",
  "duration_s": 74, "source": "voice",
  "transcript": "...", "word_count": 182,
  "summary": "You ...", "key_points": ["...", "..."], "stance": "...",
  "themes": [{"id": "uuid", "name": "Open source"}],
  "related": [{"log_id": "uuid", "date": "...", "title": "...", "theme": "Imposter syndrome", "snippet": "...", "similarity": 0.81}],
  "steps": {"themes_added": 2, "related_found": 2}
}
```

### ✅ `GET /logs?q=&before=` (S08)
Newest first, 50 per page. `q` = keyword search on title + transcript. Next page: `before=<created_at of last item>`.
```json
[{"id": "uuid", "title": "...", "created_at": "...", "duration_s": 74, "source": "voice",
  "primary_theme": {"id": "uuid", "name": "Open source"}}]
```
`duration_s` null + `source: "typed"` → show "typed".

### ✅ `GET /logs/{id}` (S06)
Same shape as the POST response, without `steps`. `related` = older logs that say similar things.

### ✅ `PATCH /logs/{id}` `{"title": "..."}` → log
### ✅ `POST /logs/{id}/themes` `{"name": "Imposter syndrome"}` → log (S06 "+ Add theme"; reuses an existing theme by name or creates one)
### ✅ `DELETE /logs/{id}/themes/{theme_id}` → log (S06 chip ×)

## Home

### ✅ `GET /home` (S03)
```json
{
  "counts": {"logs": 40, "themes": 8, "chats": 12},
  "themes": [{"id": "uuid", "name": "Open source", "description": "...", "log_count": 12,
              "first_log_at": "...", "last_log_at": "..."}],   // top 6 by recent activity
  "nudge": {"theme_id": "uuid", "theme_name": "Imposter syndrome", "count": 3,
            "window": "this week", "message": "You've come back to this 3 times this week."}  // or null
}
```
Nudge dismissal is app-local. Weekly summary is not built (hide that block).

## Themes

### ✅ `GET /themes` → all themes, same item shape as `home.themes` (for "View all")
### ✅ `GET /themes/{id}` (S09 header + All logs tab)
```json
{"id": "uuid", "name": "...", "description": "...", "log_count": 7, "first_log_at": "...", "last_log_at": "...",
 "logs": [{"id": "uuid", "title": "...", "created_at": "...", "duration_s": 60, "source": "voice"}]}
```
### ✅ `PATCH /themes/{id}` `{"name": "..."}` → theme

### ✅ `GET /themes/{id}/report` (S09 How it changed)
First call for a theme takes ~5–15 s (then cached until the theme gets a new log).
```json
{
  "status": "ok", "cached": true, "log_count": 5,
  "report": {
    "overview": "You ...",
    "then": {"quote": "Real contributors are a different kind of person.", "log_id": "uuid", "date": "...", "title": "..."},
    "now":  {"quote": "Small contributions count.", "log_id": "uuid", "date": "...", "title": "..."},
    "shifts": [{"text": "You ...", "log_id": "uuid", "date": "...", "title": "..."}],
    "open_question": "Does this hold for job interviews, or just open source?"
  }
}
// fewer than 2 logs: {"status": "not_enough_history", "log_count": 1, "report": null}
```
"Answer out loud" → start a capture; the app can prefill/attach the open question.

## Chats (Ask)

### ✅ `POST /chats` (S10 send → S11)
```json
// request
{"question": "What did I learn at hackathons?", "theme_ids": ["uuid"], "log_ids": []}
// response
{
  "chat_id": "uuid", "question": "...",
  "text": "You learned to scope down early [1] and that judges care about the demo [2].",
  "supported": true,
  "citations": [{"n": 1, "log_id": "uuid", "title": "...", "date": "...", "snippet": "..."}]
}
// nothing relevant: {"text": "That isn't in your journal yet.", "supported": false, "citations": []}
```
Render `[n]` as pills that open `GET /logs/{log_id}`. Only the first `theme_ids` entry filters retrieval.

### ✅ `POST /chats/{id}/messages` `{"question": "..."}` → same shape (follow-up)
### ✅ `GET /chats` → `[{"id", "title", "theme_ids", "log_ids", "updated_at"}]`
### ✅ `GET /chats/{id}` → chat + `"messages": [{"role": "user"|"assistant", "text", "citations", "created_at"}]`

Suggestions on S10 and post ideas on S18 are static in the app.

## Writing studio 🚧

Shapes below are the plan; they may change slightly when built.

- `POST /pieces` `{"items": [{"text": "...", "title": "optional", "source_label": "Pasted"}]}` → pending pieces (S14 Paste; for .md/.txt files read the text on the phone and send it). File (.docx/.pdf) and link import are not built.
- `DELETE /pieces/{id}`
- `POST /styles/analyze` (S15, ~10–30 s) → `{"pieces_read": 4, "styles": [...], "merge_suggestion": {"a": "uuid", "b": "uuid", "reason": "..."} | null}`
- `GET /styles` → `[{"id", "name", "piece_count", "traits": ["", "", ""], "where_used"}]` (S12, S16, SH1)
- `GET /styles/{id}` → style + `"sample"`, `"pieces": [{"id", "title", "source_label", "word_count"}]` (S17)
- `PATCH /styles/{id}` `{"name"}`, `POST /styles/merge` `{"keep_id", "merge_id"}`, `PATCH /pieces/{id}` `{"style_id"}`
- `POST /drafts` `{"prompt": "...", "style_id": "uuid" | null, "log_ids": [], "theme_ids": [], "kind": "linkedin"|"blog"|"story"}` (null style = "Let Echo choose") → draft
- Draft shape: `{"id", "kind", "title", "text", "style_id", "source_logs": [{"id", "title", "created_at"}], "status": "draft"|"saved"|"published", "version", "char_limit", "updated_at", "saved_at", "published_at", "platform", "url"}`
- `GET /drafts?status=draft|saved|published` (S12 tabs), `GET /drafts/{id}` (S13)
- `PUT /drafts/{id}` `{"text"}` (manual edit, new version) · `POST /drafts/{id}/revise` `{"instruction": "Shorter"}` · `POST /drafts/{id}/restyle` `{"style_id"}`
- `POST /drafts/{id}/save` (Save for later) · `POST /drafts/{id}/publish` `{"platform": "linkedin"|"blog"|"other", "url": null}` (SH2; post becomes a piece in its style)
