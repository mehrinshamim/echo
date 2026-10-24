# Echo: UI/UX and user flows, for backend architecture and API design

**Audience:** backend team. **Purpose:** every screen, flow, and piece of data the UI shows, creates, edits, or deletes, so you can derive entities, endpoints, async jobs and LLM calls. This doc describes needs only. It does not prescribe endpoint paths, schemas or tech.

**Frame count (verified against the HTML):** the current design is 1 component with **18 screens + 2 bottom sheets** (`EchoPhone5`), shown in **31 frames**: 17 in Echo Mobile section 6 (frames 01-17) and 14 in section 7 (W1-W14). Several frames are the same screen in a different tab/state. Sections 1, 2, 3 and 5 of `Echo Mobile.dc.html` are earlier exploration and are superseded (Appendix B).

**Sources**
- `EchoPhone5.dc.html` (`~/Downloads/echodesign2/`; NOT in `doc-ignore/design-writing/`, which only has the wrapper pages that import it). Cited as `(P5 Lnnn)`. This is the source of truth for screen content and prototype data.
- `doc-ignore/design-writing/Echo Mobile.dc.html`, sections `#t6` and `#t7` (frame list, flow notes). Cited as `(EM #t6 07)` / `(EM #t7 W9)`.
- `doc-ignore/design-writing/EchoHome5.dc.html`: Home variants a/b/c only. Variant c is the chosen one.
- Context only: `Echo - Context and PRD.md`, `BACKEND_PLAN.md`. Conflicts with the design are in section 9.

**Conventions:** `[API]` = step needs the backend. `(inferred)` = not stated in the design. Everything else is read straight from the design. The prototype uses canned data and timers, so durations like "2.6 s analyzing" are placeholders for real jobs.

---

## 1. Product summary

Echo is a private, voice-first thought journal for one user. The user speaks (or types) a **log** after an event. Echo transcribes it **on the phone** (audio never leaves the device, per UI copy), then the backend summarizes it, extracts key points, files it under **themes**, and finds **related older logs**. The user can **Ask** questions across their logs and get answers with citations. In **Write mode** the user uploads past writing; Echo groups it into **styles**; then turns logs/themes into **posts** (LinkedIn / blog / story) in a chosen style, edits and revises them, and marks them published. Published posts feed back into the styles.

Surfaces, each with a colour code the API does not need to know: Logs (blue), Themes (pink), Chats (green), Styles (yellow), Write mode (ink/black header).

Single user per account. Sign-in is Google only. English-only for the hackathon build (PRD), but see open question Q14.

---

## 2. Screen inventory

| ID | Screen | Mode | Entry points | Exits | Frames |
|---|---|---|---|---|---|
| S01 | Onboarding | Start | App first launch | S02 | 6a-01 |
| S02 | Sign in with Google | Start | S01 | S03 (on success), S01 (Back) | 6a-02 |
| S03 | Home | Core | S02, back from most screens | S04 (Capture), S07 (Type a log), S08 (Logs row), S09 (Themes row / theme card / nudge), S10 (Chats row), S12 (Write) | 6a-03 |
| S04 | Capture (recording) | Core | S03 Capture, S07 Capture (append), S09 "Answer out loud" | S05 (Done), S03 (Cancel), S07 (Cancel in append mode) | 6a-04 |
| S05 | Listening back (processing) | Core | S04 Done | S06 (auto), S07 (auto, in append mode) | 6a-05 |
| S06 | Log result (3 tabs: Transcript / Summary / Related) | Core | S05, S07 Save, S08 row, S09 rows, S11 citations, S13 "Built from" rows | S03 (Home), S10 (Ask about this), S13 (Make a post), S09 (See how your thinking changed) | 6a-06, 07, 08 |
| S07 | Write a log (typed) | Core | S03 "Type a log" | S06 (Save), S03 (Back), S04 (Capture to append) | 6a-09, 10 |
| S08 | Logs list | Core | S03 Logs row, S06 Related card | S03, S06 | 6a-11 |
| S09 | Theme (2 tabs: How it changed / All logs) | Core | S03 (Themes row, theme cards, nudge), S06 | S03, S10 ("Ask this theme"), S06 (rows), S04 ("Answer out loud") | 6a-12, 13 |
| S10 | New chat (Ask) | Core | S03 Chats row, S06 "Ask about this", S09 "Ask this theme", S11 back | S11 (send / suggestion), S03 (close) | 6a-14, EM #t7 W14 |
| S11 | Cited answer | Core | S10 | S10, S06 (citations), S13 (Make a post) | 6a-15 |
| S12 | Write home ("Your posts", 3 tabs: Drafts / Saved / Published) | Write | S03 Write, S13 Save for later / Finish, S14, S16, S18 back | S18 (+ New post), S14 (Upload writing), S16 (Manage), S17 (style card), S13 (draft row), S03 (Echo back) | 6a-16, W1, W2, W3 |
| S13 | Draft editor | Write | S12 rows, S06 / S11 "Make a post", S18 send | S12, SH1 (+ Style), SH2 (Finish), S06 (Built from rows) | 6a-17, W12 |
| S14 | Add your writing (Paste / File / Link) | Write | S12 Upload writing, S16 + Upload more, SH1 + Upload new writing | S15 (Analyze), S12 (Back) | W4, W5 (Link has no frame, exists in component) |
| S15 | Analyzing your writing | Write | S14 Analyze | S16 (auto) | W6 |
| S16 | Your writing styles | Write | S12 Manage, S15 | S17, S14, S12 | W7, W8 |
| S17 | Style detail | Write | S12 style card, S16 row | S18 ("Write in this style"), S16 | W9 |
| S18 | New post chat | Write | S12 + New post, S17 "Write in this style" | S13 (send / idea row), SH1, S12 | W10, W11 |
| SH1 | "Write it like…" style picker sheet | Sheet | "+ Style" on S10, S13, S18 | closes on pick; S14 (+ Upload new writing) | W11 |
| SH2 | "Finish this post" sheet | Sheet | S13 Finish | S12 Published tab | W13 |

States shown in the design: empty = none (see Q1), loading = S05, S15 only, error = none, offline = none.

---

## 3. Navigation map

```
S01 Onboarding → S02 Sign in (Google) → S03 HOME
                                          │
   ┌────────────┬──────────┬──────────────┼───────────────┬───────────────┐
   │ Capture    │ Type a   │ Logs row     │ Themes row /  │ Chats row     │ Write button
   ▼            │ log      ▼              │ theme card /  ▼               ▼
 S04 Record     ▼         S08 Logs list   │ nudge         S10 New chat    S12 WRITE HOME
   │ Done      S07 Write   │ tap           ▼               │ send / ↳      │
   ▼           a log ──────┼──────────► S09 Theme          ▼               ├ + New post → S18 Post chat ─ send → S13
 S05 Listening   Save      ▼             (evo | all logs)  S11 Cited       ├ Upload writing → S14 → S15 → S16 → S17 → S18
 back (auto)    ─────────► S06 Log result                  answer          ├ Manage styles → S16
   │ auto                  (tx | summary | related)         │ [n] → S06     └ draft/saved row → S13 → Save for later → S12 Saved
   └──────────► S06 ◄──────────────────────────────────────┘                                   → Finish (SH2) → S12 Published
 S06: "Ask about this" → S10 (log as context) · "Make a post" → S13 · "See how your thinking changed" → S09
 S09: "Ask this theme" → S10 (theme chip) · "Answer out loud" → S04
 "+ Style" (S10, S13, S18) → SH1 → pick style | Let Echo choose | + Upload new writing → S14
```

---

## 4. Per-screen detail

Format per screen: contents, actions, data, states. "Data shown" lists fields with a type guess.

### S01 Onboarding (P5 L14)
- Contents: wordmark "echo"; 3 value rows (Log what you said / See the themes that keep coming back / Ask, then write in your own voice); headline "Say it once. Find it again."; one paragraph; button "Get started".
- Actions: Get started → S02. No backend.
- Data: static copy. No backend need. (inferred) first-run flag is local.

### S02 Sign in (P5 L29)
- Contents: Back; "Sign in to keep your logs safe"; copy "Your account backs up your logs and themes. Audio never leaves your phone."; checks "Only you can see your logs", "Delete everything anytime"; **Continue with Google**; Terms and Privacy line.
- Actions: Continue with Google [API] → on success S03. Back → S01.
- Data written: user account (Google identity). Returned: session, display name/initial ("M" avatar on Home).
- Implies: account-level data deletion ("Delete everything anytime") but no screen exists for it (Q8). Terms/Privacy links need destinations (inferred).

### S03 Home (P5 L44; chosen variant c in EchoHome5 L104)
- Contents, top to bottom:
  - Avatar circle with initial (not wired) and a "Write" button.
  - Today's date ("Saturday, 24 October").
  - **"Echo noticed" nudge card** (dismissible ×): header "Echo noticed · {theme}", body "You've come back to this 3 times this week. It sounds lighter each time.", link "See how it changed" → S09.
  - Three rows with counts: **Logs 40**, **Themes 8**, **Chats 12**.
  - **Your themes**: 2-col grid of up to 6 theme cards (name, "7 logs · 2d ago"), "View all 8 →".
  - **This week, in your words**: 2 bullet sentences generated from the week ("You fixed your first bug at the Wikimedia hackathon." / "You talked most about starting small."). Optional (a prototype toggle `showWeek`).
  - Docked bar: "Type a log" field (opens S07) + **Capture** button (opens S04).
- Actions: dismiss nudge; open theme / logs / chats / write; capture; type.
- Data read [API]:
  - counts: logs, themes, chats (ints)
  - nudge: `{theme_id, theme_name, count, window ("this week"), message (LLM-written, tone-aware: "lighter each time")}` or none
  - top themes: `{id, name, log_count, last_log_at}` sorted (inferred: by recent activity), 6 shown of N
  - weekly summary: `string[]` of 2 (inferred: LLM, once per week)
- Writes: nudge dismissal (persist? Q9).
- States: nudge absent; weekly summary absent (toggle); no empty state designed (new user with 0 logs, Q1).

### S04 Capture / recording (P5 L85)
- Contents: status "Listening"/"Paused" with dot; label "Transcribing on this phone"; pulsing timer circle (mm:ss); live transcript text streaming in with a cursor; buttons Cancel, Pause/Resume, Done. In append mode (from S07): line "Adding to: {log title}".
- Actions: Pause/Resume (local). Cancel: discard (local). Done → S05.
- Backend: none during recording. Transcription is on-device (whisper.cpp, PRD). Live partial text is client-side. Only the final transcript text is sent.
- Data: elapsed seconds, live text (client).

### S05 Listening back / processing (P5 L104)
- Contents: pulsing dot, "Listening back…", a 4-step checklist that ticks as each step completes:
  1. Transcribed on your phone
  2. Summary and key points ready
  3. Added to 2 themes
  4. Found 2 related logs
- Auto-advances to S06 (or back to S07 in append mode, no server round trip is shown there).
- Backend [API]: this is the **log save pipeline**: input transcript text (+ optional title, created time, duration, source=voice). Work: summary, key points, title, theme assignment (reuse existing or create; count shown as "2 themes"), related-log search ("2 related logs"). Steps 3 and 4 show counts, so the result must include them. Whether to stream step progress or poll is a backend decision. UI only needs: step completion events or one final response with the counts. Latency tolerance: prototype 2.6 s total.
- Failure path not designed (Q2).

### S06 Log result (P5 L114)
- Header: Back ("Home"), date + duration ("Sat 24 Oct · 1 min"), **title** (generated), segmented tabs **Transcript / Summary / Related**, bottom bar **Ask about this** and **Make a post**.
- **Transcript tab:** card "Transcript · 182 words", **Copy** button, full text (selectable).
- **Summary tab:**
  - **Themes · tap to edit:** pink chips with × (remove) and "+ Add theme".
  - **Summary** paragraph.
  - **Key points** list (3 shown).
- **Related tab:** "You've said things like this before": cards with `{date, theme, quoted snippet}`, tap → a log; link "See how your thinking changed" → S09.
- Actions:
  - Copy transcript (client).
  - Remove a theme from this log, add a theme (existing or new) [API].
  - Open related log.
  - Ask about this → S10 with this log as context. Make a post → S13 with this log as source.
- Data [API]: log `{id, title, created_at, duration_s | typed, transcript, word_count, summary, key_points[], themes[{id,name}], related[{log_id, theme, date, snippet}]}`.
- Notes: "Related" means semantic similarity across the user's logs, ordered (inferred: by relevance, shown chronologically with a timeline line). The transcript itself is not editable on this screen. PRD wants editable transcripts before save (Q5).

### S07 Write a log (typed) (P5 L166)
- Contents: Back, **Save**; label "New log · Sat 24 Oct"; **title** input (prefilled "Mentor table notes"); body textarea; optional appended block "From capture · 0:42" (blue bar) shown below the typed text; footer "Talk to add more. It goes below your text." + **Capture** button.
- Actions: type; Capture (append) → S04 → S05 (skipped) → back here with the transcript appended below; Save → S06.
- Backend [API] on Save: same pipeline as S05 (summary, themes, related). The prototype jumps straight to S06 with no processing screen (Q6). A log can therefore contain **multiple segments** (typed text, captured speech), each with an origin label and capture duration. Title is user-editable.
- Data written: `{title, body, segments[{origin: typed|captured, text, duration_s}]}` (inferred).
- Notes: this is the only place a user-authored title exists. In S06 the title is generated.

### S08 Logs list (P5 L187)
- Contents: Back, "Logs" header with blue square; **search field** ("Search logs"); logs grouped **by day** (heading "Today · Sat 24 Oct", "Thu 22 Oct"…), a blue timeline per group; each card: title, meta "9:40 PM · 1 min · Open source" (time, duration or "typed", first theme).
- Actions: search [API]; tap a log → S06.
- Data [API]: paginated, newest first, grouped by local day (inferred: client groups). Fields: `{id, title, created_at, duration_s | typed, primary_theme}`. Titles may be in Malayalam script (Q14).
- Search semantics unspecified: keyword vs semantic, searches title/transcript (Q10). No filters, no delete/edit-from-list.

### S09 Theme (P5 L206)
- Header: Back ("Themes"), **Ask this theme**. Pink card: theme name, "7 logs · May to October". Tabs **How it changed / All logs**.
- **How it changed** (the evolution report):
  - two cards: **Then · {month}** quote vs **Now · {month}** quote.
  - **What changed**: timeline of `{date, text, → source log}` (3 shown).
  - **Still open**: a question + **Answer out loud** → S04.
- **All logs:** timeline of cards `{title, date}` newest first, tap → S06.
- Data [API]: theme `{id, name, log_count, first_log_at, last_log_at}`; report `{then{date,quote}, now{date,quote}, shifts[{date, text, log_id}], open_question}`; logs `[{log_id, title, date}]`.
- The report is LLM-generated and expensive; it changes when the theme gets new logs (inferred: cache and mark stale, as `BACKEND_PLAN.md` does).
- Not designed: theme rename, merge, delete, or a Themes list screen (the Home "Themes" row opens a single theme; "View all 8 →" has no target, Q3).

### S10 New chat / Ask (P5 L239)
- Header: close ×, green "New chat" title. H1 "Ask your logs". Copy: "Answers only use what you've said, and every line links back to the log it came from."
- 3 suggestion rows (↳): "What did I learn at hackathons this month?", "What do I keep saying about open source?", "Prepare me for my next event".
- Docked composer: input "Ask anything"; **context chips** (selected theme, e.g. pink "Imposter syndrome ×"); buttons **+ Theme**, **+ Log**, **+ Style**; send ↑.
- Actions: pick suggestion or send → S11; add/remove context chips; "+ Style" opens SH1 (EM #t7: "Ask chat gains + Style").
- Data [API]: suggestions are generated or fixed (Q11). Chat request `{question, context: {theme_ids[], log_ids[], style_id?}}`.
- Pickers for + Theme and + Log are **not designed** (no screen or sheet, Q3). "Prepare me for my next event" implies event or calendar knowledge, which no screen supplies (Q11).

### S11 Cited answer (P5 L264)
- Contents: Back ("Chats"), context chip (theme). Right-aligned green user bubble. Assistant answer paragraph with **inline citation pills** [1] [2] that open the source log. "From your logs" list: numbered cards `{n, log title, date}`. Buttons **Copy**, **Make a post** → S13. Bottom "Ask a follow-up" input.
- Data [API]: answer `{text with citation markers, citations[{n, log_id, title, date}]}`. Every claim must map to a source log (UI promise). Chat turns belong to a persisted conversation (Chats count 12 on Home).
- Not designed: chats list/history screen (Q3), streaming display, "no answer found" state, rename/delete chat.

### S12 Write home (P5 L284)
- Ink header: back pill "Echo", label "Write mode", H1 "Your posts", buttons **+ New post** and **Upload writing**.
- **Your styles**: "Manage ›" → S16; horizontal cards `{name, "N pieces"}` → S17.
- Tabs:
  - **Drafts**: cards `{platform tag, "v3 · today", title, "Style · N logs"}` → S13.
  - **Saved**: note "Finished, not posted yet."; cards `{platform, "Saved 3d ago", title}` with **Copy** and **Mark published**.
  - **Published**: timeline `{platform, date, title, "View post ↗", "Added to your styles"}`.
- Data [API]: styles list; drafts (status draft); saved (status saved); published (status published, with `published_at`, `platform`, optional `url`). A draft has a version number.
- Behaviour to note: "Mark published" on a Saved card moves it to Published in the prototype **without** the platform/link step that SH2 asks for (Q7).
- Frames: W1 drafts, W2 saved, W3 published; a just-published post appears on top dated "Today".

### S13 Draft editor (P5 L427)
- Ink header: Back, status label **Edited / Saved**, button **v3 · History** (not wired).
- Style chips (horizontal, selected = filled; "+ Style" dashed). Switching a chip **swaps the draft text live**.
- Large editable textarea; footer **"N / limit characters"** (limit **3000**, **280** for the Story kind) and **Copy**.
- Revision chips: **Shorter, Stronger hook, More casual, End with a question**.
- **Built from**: log rows `{title, date}` → S06; dashed "+ Log".
- Bottom: **Ask for changes** input; **Save for later** (→ S12 Saved); **Finish** (→ SH2).
- Data [API]: draft `{id, kind (LinkedIn|Blog|Story), style_id, text, version, source_log_ids[], status, updated_at, char_limit}`. Actions: generate (on entry from S18/S06/S11), regenerate in another style, revise (chip or free-text instruction, produces a new version), user edits (autosave? label flips Edited→Saved), add/remove source log, save, finish.
- Version history exists as a concept (v3, History button) but **no history screen is in the current design** (Q4).
- In the prototype each style has its own saved edit text, which hints that a draft might keep one text per style (Q12).

### S14 Add your writing (P5 L323)
- Ink header "Write" back, title "Add your writing". Intro: "Add posts, articles or threads you've already written. Echo learns how you write, groups them by style, and uses them when you make a post."
- Source selector: **Paste / File / Link**.
  - Paste: textarea + **Add**.
  - File: "Choose files", ".docx, .pdf, .md or .txt · up to 20 at once", **Browse**.
  - Link: field "LinkedIn, Medium or blog URL" + **Import**; note "A profile link imports your recent public posts."
- **Added · N pieces** list `{title (or first 40 chars), source line e.g. "Pasted · 220 words", "Medium link · 1,400 words", "File · 900 words", "Link · 5 posts"}` with × remove.
- Bottom button **Analyze N pieces** → S15.
- Backend [API]: ingest text; parse docx/pdf/md/txt (up to 20 files); fetch/scrape a URL, including a profile URL that expands into multiple posts (title, word count, source label come back); remove pending piece; start analysis. Whether removing a piece before analysis is a server call or local is open (Q13). The initial list shows 4 pre-existing items, which suggests pending uploads persist between visits (inferred).
- Constraints seen: 20 files per batch; the four file types; per-piece word count shown.

### S15 Analyzing your writing (P5 L352)
- No ink header. Four animated bars, "Reading how you write", 4 steps: Read 4 new pieces / Compared tone, length and structure / Sorted into your styles / Found 2 styles that read alike. Privacy line: "Your writing stays private. Echo only uses it to match your voice." Auto → S16.
- Backend [API]: **async job** over N pieces: per-piece analysis, clustering into styles (assign to existing or create), merge-suggestion detection. UI needs completion plus counts (new pieces read, styles, whether a merge is suggested). Treat as long-running; the 2.6 s is a placeholder.

### S16 Your writing styles (P5 L363)
- Ink header: back "Write", **+ Upload more**. H1; subline "Echo grouped {total} pieces into {n} styles. Tap one to see what it learned."
- **Merge suggestion card** (dashed): "These two read alike" + two style chips + reason ("Both open with something you admit, keep lines short, and end with advice.") + **Merge** / **Keep separate**.
- After Merge: bar "Merged into Reflective LinkedIn · 8 pieces" with **Undo**; the other style disappears and its pieces move into the survivor (6+2=8).
- Style rows: name, "N pieces", trait line (3 traits joined " · ").
- Data [API]: styles `{id, name, piece_count, traits[3]}`; merge suggestion `{style_a, style_b, reason}`; actions: merge (reversible), dismiss suggestion ("Keep separate", should persist, Q9), undo.

### S17 Style detail (P5 L385)
- Ink header: back "Styles", **Write in this style** → S18 with this style preselected.
- Yellow card: name (H1) + **Rename**; "6 pieces · mostly LinkedIn".
- **How you write here:** 3 traits ("Opens with something you admit", "Short lines, one idea each", "Ends with one piece of advice").
- **Sounds like:** one quoted sample line.
- **Pieces:** rows `{title, source "LinkedIn · published 14 Oct" | "Pasted · 220 words" | "Medium link · 1,400 words" | "File · 900 words"}` with **Move** button.
- Data [API]: style detail `{id, name, piece_count, where_used (string, derived e.g. "Medium and your blog"), traits[], sample, pieces[]}`; actions: rename, move piece (to another style; target picker not designed, Q3).
- Not designed: delete a piece, delete a style.

### S18 New post chat (P5 L402)
- Ink header: back "Write", "New post". H1 "What do you want to post?"; helper "Add logs or themes for what to say, and a style for how to say it."
- **From this week**: 3 generated post ideas (↳), e.g. "A LinkedIn post about the Wikimedia hackathon", "What changed in how I think about imposter syndrome", "A thread on the mentor table"; tapping goes to S13.
- Composer card: prompt text ("A LinkedIn post about the hackathon"), chips (selected style, a log), **+ Style**, **+ Log**, **+ Theme**, send ↑ → S13.
- Data [API]: post ideas `[string]` (LLM, from recent logs, inferred); generate request `{prompt, style_id | "auto", log_ids[], theme_ids[]}` → creates a draft.
- The prompt input is shown as placeholder text only; whether it is free text is open (Q11).

### SH1 Style picker "Write it like…" (P5 L452)
- Sheet with close ×. Rows (radio): each style `{name, "N pieces · where used"}`, selected row tinted; last row **Let Echo choose** ("Picks the closest style to what you ask"); button **+ Upload new writing** → S14.
- Data: same style list as S16. "Let Echo choose" means the server picks a style from the prompt (inferred: a classification step).

### SH2 Finish this post (P5 L464)
- Sheet: **Copy text**; "Where did you post it?" segmented **LinkedIn / Blog / Other**; optional "Paste the link"; note "Published posts are added to your styles, so the next one sounds even more like you."; **Mark as published**.
- Backend [API]: set draft status published with `{platform, url?, published_at}`; the published text becomes a **new piece in a style** (the piece is the post; which style = the draft's style, inferred), which can re-trigger style learning (async, inferred). Then S12 Published tab shows it first, dated "Today".

---

## 5. User flows

Steps marked `[API]` hit the backend.

**F1 First run**
1. S01 Get started. 2. S02 Continue with Google `[API: auth]`. 3. S03 Home (empty state not designed). (inferred) First launch also downloads the on-device speech model (~142 MB, PRD); no UI for this in the design (Q5).

**F2 Capture a log by voice**
1. S03 Capture. 2. S04 records and transcribes on device. 3. Done → S05. 4. `[API]` save transcript → summary, key points, title, themes, related logs. 5. Steps tick on S05. 6. S06 Transcript tab opens. 7. User opens Summary / Related; may edit themes `[API]`.

**F3 Write a log by typing, then append speech**
1. S03 Type a log → S07. 2. Type title + body. 3. Capture → S04 (label "Adding to: …") → Done → back on S07 with "From capture" block appended (no processing screen). 4. Save `[API]` (same pipeline as F2) → S06.

**F4 Browse logs and themes**
1. S03 Logs row → S08 `[API: list/search]` → tap → S06 `[API]`.
2. S03 theme card / nudge / Themes row → S09 `[API: theme + report]`. Toggle How it changed / All logs. "Answer out loud" starts F2 with the open question as prompt (inferred: the question is attached to the new log).

**F5 Recurring-thought nudge**
1. S03 shows "Echo noticed" `[API]`. 2. Tap "See how it changed" → S09 evolution. 3. × dismisses.

**F6 Ask a question**
1. S03 Chats → S10. (or S06 "Ask about this", S09 "Ask this theme": context chip preloaded.) 2. Optionally add Theme / Log / Style chips. 3. Send or tap a suggestion `[API: retrieve + answer]` → S11. 4. Tap [n] → S06 for that log. 5. Ask a follow-up `[API]`, Copy, or Make a post → S13.

**F7 Upload writing and build styles**
1. S12 Upload writing (or SH1 + Upload new writing, S16 + Upload more) → S14. 2. Add by paste / file / link `[API: parse/import]`; remove unwanted. 3. Analyze N pieces `[API: async job]` → S15. 4. S16 shows styles + merge suggestion. 5. Merge or Keep separate `[API]`; Undo `[API]`. 6. Tap a style → S17 `[API]`; Rename `[API]`; Move a piece `[API]`.

**F8 Create a post**
1. S12 + New post (or S17 Write in this style, S06/S11 Make a post) → S18 / S13. 2. In S18 choose style / logs / themes, type what to say, send `[API: generate draft]` → S13. 3. Switch style chip → text changes `[API]`. 4. Edit text; tap a revision chip or "Ask for changes" `[API: revise]` → new version. 5. Save for later `[API]` → S12 Saved. Or Finish → SH2 → Mark as published `[API]` → S12 Published (top, "Today") and the post is added to a style.

**F9 Resume a draft / publish later**
1. S12 Drafts tab → S13. Or S12 Saved tab: Copy, or Mark published `[API]` → Published tab.

---

## 6. Data entities inferred from the UI

| Entity | Fields seen on screen | Relations / aggregates / limits |
|---|---|---|
| **User** | Google identity, display initial ("M") | Owns everything. Delete-all is promised (S02). |
| **Log** | title, transcript/body, segments (typed / captured with duration), created_at (date + time), duration or "typed", word count ("182 words"), summary, key_points[3], source (voice/typed) | N themes ("Added to 2 themes"); related logs; counted on Home (40). Titles can be non-English. |
| **Theme** | name, log_count, first/last log date ("May to October", "2d ago"), colour is fixed pink | Many-to-many with logs; user can add/remove on a log (S06). Count on Home (8). |
| **Theme report** | then{date,quote}, now{date,quote}, shifts[{date,text,log_id}], open_question | One per theme; regenerated when stale (inferred). |
| **Related link** | log_id, date, theme, quoted snippet | Computed per log (similarity). |
| **Nudge** | theme, count, window, message, dismissed | Computed; "this week" (Home copy) vs "this month" (earlier frames). |
| **Weekly summary** | 2 sentences | Computed weekly (inferred). |
| **Chat** | scope chips (themes, logs, style), messages | Count on Home (12). No title/list UI. |
| **Message** | role, text, citations[{n, log_id, title, date}] | Every assistant line must cite a log. |
| **Style** | name (renamable), piece_count, traits[3], sample line, where_used, merge state | Pieces; merge suggestion `{a, b, reason}`; undoable merge. |
| **Writing piece** | title, text, source type (pasted / file / link / published), source label, word count, date, pending vs analyzed | Belongs to one style; movable; pending pieces are removable. Published posts become pieces. |
| **Draft / Post** | kind (LinkedIn/Blog/Story), title, text, version n, style_id, source logs[], status (draft / saved / published), updated_at, saved_at, published_at, platform (LinkedIn/Blog/Other), url?, char_limit | Limit 3000 chars, 280 for Story. "Saved 3d ago", "v3 · today". |
| **Post idea** | one-line string | Generated from recent logs (S18). Not persisted (inferred). |

Limits and constants seen: 20 files per upload; file types .docx .pdf .md .txt; 3000 / 280 character limits; 3 key points and 3 traits displayed (may be more); Home shows 6 themes; 3 chat suggestions; 3 post ideas; 4 revision chips; 3 publish platforms.

---

## 7. Backend capability checklist

| Feature | UI needs | Mode |
|---|---|---|
| Auth | Google sign-in, session, account delete | req/resp |
| Log save pipeline | Input transcript + metadata; output title, summary, key points, themes (existing or new), related logs with counts | async-ish, 4 visible steps; LLM + embeddings |
| Log CRUD | create, read, edit title/body/themes, (delete not designed) | req/resp |
| Log list + search | date-grouped, newest first, paginated, search box | req/resp; semantic or keyword (Q10) |
| Themes | list with counts + recency, detail, add/remove theme on a log | req/resp |
| Evolution report | then/now/shifts/open question per theme; cached, refreshed after new logs | LLM (quality tier), cacheable |
| Related logs | per-log similar logs with snippet | vector search |
| Nudge + weekly summary | recurring-theme detection; periodic summary; dismissal state | scheduled or on-save |
| Ask / chat | scoped retrieval (themes / logs / style), cited answer, follow-ups, persisted chats, suggestions | LLM + RAG; likely streaming |
| Upload ingest | paste, up to 20 files of 4 types, URL import incl. profile → many posts | parsing, scraping (ToS risk, Q13) |
| Style analysis | async job: per-piece features, cluster into styles, name them, traits, sample line, merge suggestion | long-running, LLM |
| Style mgmt | rename, merge, undo merge, dismiss suggestion, move piece | req/resp |
| Draft generation | from prompt + style + logs/themes; "Let Echo choose" style | LLM (quality tier) |
| Draft revise | chips + free-text instruction, new version each time | LLM |
| Draft CRUD + versions | autosave state, version counter, history (screen missing) | req/resp |
| Publish | status change, platform, optional url, feeds style learning | req/resp + async re-learn |
| Counts / aggregates | Logs, Themes, Chats on Home; "N pieces"; "N logs" | cheap queries |

Real-time/streaming candidates: S05 step ticks, S11 answer, S13 generation. The design only shows finished results. Pagination, undo (merge only), versioning (v3), and sorting by recency are the only list behaviours shown. No filters, bulk actions, or sharing.

---

## 8. Non-functional hints from the UI

- **Privacy copy:** "Audio never leaves your phone"; "Only you can see your logs"; "Delete everything anytime"; "Your writing stays private. Echo only uses it to match your voice." Implies per-user isolation and a real delete-all path.
- **Auth:** Google only; no email/password, no settings, no sign-out screen.
- **Offline:** nothing designed. Recording and transcription work on-device, so capture can plausibly queue offline (inferred; Q2).
- **Latency expectations:** the save pipeline ~2.5 s, analyze ~2.6 s, in the prototype. Real jobs will differ; plan for progress and for failure.
- **Cost-sensitive actions:** evolution report, draft generation, revise, style analysis of up to 20 files per batch, weekly summary.
- **Data volume:** UI shows 40 logs, 12 chats, 8 themes as the demo scale.
- **Accessibility affects API little:** counts always accompany colour; no extra data.

---

## 9. Open questions (numbered)

1. **Empty states:** no design for a brand-new user on Home, Logs, Themes, Chats, Write (no styles, no drafts).
2. **Errors and offline:** nothing for failed save/transcription/analysis/generation, offline capture, or retry. Does a capture saved offline queue?
3. **Missing screens/pickers:** Themes list ("View all 8 →" and the Themes row go nowhere/directly to one theme); Chats list/history; "+ Theme", "+ Log" pickers (S10, S13, S18); "Move" target for a piece; style/piece/theme delete; theme rename/merge.
4. **Version history:** S13 shows "v3 · History" but there is no history screen. Earlier exploration had one (Appendix B). What does a "version" mean: every AI revision, every manual edit, every style switch?
5. **Editable transcript:** PRD requires editing the transcript before save (misheard names). The current S06 transcript is read-only and S04 goes straight to processing. Where does editing happen? Also: on-device model download UI is missing.
6. **Typed log processing:** S07 Save jumps to S06 with no processing screen; appended captures skip processing. Do these run the same pipeline, and is it silent?
7. **Mark published from Saved** skips SH2 (no platform, no link) in the prototype. Which is right? Does publishing always require a platform?
8. **Settings/account:** avatar on Home is not wired; "Delete everything anytime" has no screen; no sign-out, export, or profile.
9. **Persistence of UI state:** nudge dismissal, "Keep separate" on a merge suggestion, pending upload list. Persist server-side or locally?
10. **Search:** keyword vs semantic; fields searched; result ranking; any filters (by theme/date)?
11. **Generated vs fixed copy:** are Ask suggestions and "From this week" post ideas generated per user? "Prepare me for my next event" implies event/calendar data. Is there such a source? Is the S18 prompt free text?
12. **Draft vs style:** does a draft hold one text, with style switch regenerating it (losing edits), or one text per style (as the prototype's per-style edits suggest)?
13. **Link import:** profile URL "imports your recent public posts" is scraping (LinkedIn/Medium ToS, auth walls). Allowed hosts, and how many posts per import? Is removal of a pending piece server-side?
14. **Languages:** PRD says English only for the build; the design shows a Malayalam log title and loads a Malayalam font. Which languages must the backend handle for summaries and themes?
15. **Consistency of copy/numbers:** Nudge says "3 times this week" on Home but "this month" in earlier frames; Themes count is 8 on Home but 6 in the earlier Home variants; "Transcript · 182 words" is canned. Treat all numbers as computed.
16. **Chats vs "Ask about this":** does opening Ask from a log/theme create a chat immediately, or only on send? Does "Make a post" from an answer carry the answer's citations as sources?
17. **Style piece for a published post:** which style receives it, and does it trigger re-analysis or only count toward the style?
18. **Draft kinds:** LinkedIn / Blog / Story tags (and 280 limit for Story) come from the style; can a user pick a kind independent of style?

---

## Appendix A. Prototype seed data (hints at shape)

- **Home:** Logs 40, Themes 8, Chats 12. Themes: Imposter syndrome (7 logs, 2d ago), Open source (12, today), Hackathon lessons (9, today), Building in public (5, 1w ago), Career & internships (4, 3w ago), Malayalam & tech (3, 1w ago); two more in the full 8: Side projects, Money (1m ago, earlier variant).
- **Weekly summary:** "You fixed your first bug at the Wikimedia hackathon." / "You talked most about starting small."
- **Log:** "Small bugs are the real on-ramp" (24 Oct, 1 min, 182 words, themes Open source + Imposter syndrome); summary "A mentor pointed you to a small citation-tool bug and you fixed it in two hours. Skill wasn't the blocker. Not knowing where to start was."; 3 key points; related: 12 Aug "Nobody expects you to know everything on day one." (Imposter syndrome), 2 Oct "The people who got furthest asked where to start." (Hackathon lessons).
- **Logs list:** Tue 20 Oct has "Content as proof for side projects" (5:42 PM, 4 min, Building in public) and "The quiet person at the mentor table" (11:05 AM, typed, Imposter syndrome).
- **Theme report (Imposter syndrome):** Then·May "Real contributors are a different kind of person."; Now·Oct "Small contributions count. Not knowing is normal."; shifts 18 Jun / 12 Aug / Today; open question "Does this hold for job interviews, or just open source?"; 5 logs 9 May to 24 Oct.
- **Styles:** Reflective LinkedIn (6, mostly LinkedIn), Technical blog (4, Medium and your blog), Story thread (3, X and Threads), Event recaps (2, LinkedIn). Merge: Event recaps into Reflective LinkedIn = 8. Traits e.g. "Opens with something you admit / Short lines, one idea each / Ends with one piece of advice". Samples e.g. "I almost didn't write any code at the hackathon."
- **Drafts:** LinkedIn "Small bugs are the real on-ramp" v3 today (Reflective LinkedIn · 3 logs); Blog "What a first hackathon actually tests" v1 2d ago (Technical blog · 5 logs). **Saved:** "Asking for help isn't failing" (LinkedIn, 3d), "The mentor table" (Story, 1w). **Published:** "I stopped waiting to feel ready" (LinkedIn, 14 Oct), "Fixing flaky tests in Wikidata" (Blog, 2 Sep), "My first merged PR" (LinkedIn, 20 Jun).
- **Uploads:** 4 pieces (pasted 220 words, Medium link 1,400 words, docx 900 words, X thread). Link import adds "Your last 5 LinkedIn posts · 5 posts"; file adds "talk-notes.md · 640 words".
- **Ask:** question "What did I learn at the Wikimedia hackathon?"; answer cites 2 logs.

## Appendix B. Superseded exploration in `Echo Mobile.dc.html` (not the current design)

Sections #t1 (two directions), #t2 (13 screens each, 2a/2b), #t3 (18 screens, 3a) and #t5 (Home in 3 styles, plan of 19 screens) explored earlier layouts. They contain concepts that are **not** in the current 18 screens, which the backend team may still see referenced:
- A dedicated **Draft versions** screen and **Published** screen (2a/2b screens 11 and 13; 3a screens 16 and 18) and a **Style library** screen (2a/2b 12; 3a 17). Now replaced by the S12 Published tab, S16/S17, and an unbuilt History button.
- Draft in your voice with 3 category toggles (LinkedIn / Blog / Story), "Shorter", "Less polished", "Ask for changes…" (1a/1b, 3a).
- A **Manglish transcript** toggle (English vs Malayalam-English text) in the prototype; PRD parks this.
- **"Notes"** wording instead of "Logs", and a "Coming up events with one-tap capture" idea (section #t3 intro text), which is the likely origin of "Prepare me for my next event" (Q11).
- A per-entry "You've thought this before" compare card; now the Related tab on S06.
