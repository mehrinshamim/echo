# Plan: commit current work, then integrate the Echo API into the app

## Context
The Expo app (`app/` in the `worktree-app` worktree) runs entirely on a local mock (`src/api.ts`) and a file-persisted store (`src/store.tsx`). `APP_API_GUIDE.md` defines the real backend (Bearer auth via Supabase, snake_case JSON). Goal: replace mocks with real calls, keep the UI as is. Commits must NOT include a Claude co-author line (saved memory overrides the default attribution).

## Step 1 — Commit current code (no Claude co-author)
- Tracked tree is clean. Untracked: `APP_API_GUIDE.md`, `ui-ux-flow-for-backend.md`, `app/node_modules` (symlink).
- Add `node_modules` (no trailing slash) to `app/.gitignore` so the symlink is ignored.
- Stage explicitly (never `git add -A`): `APP_API_GUIDE.md`, `ui-ux-flow-for-backend.md`, `app/.gitignore`.
- Commit: "Add API guide, UI/UX flow doc; ignore node_modules symlink". No Co-Authored-By trailer.

## Step 2 — Foundation
- Install: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-auth-session`, `expo-web-browser`, `expo-document-picker`, `react-native-url-polyfill` (via `npx expo install`). Dev-client rebuild needed afterwards.
- `app/.env.example` + `.env` (gitignored): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Add `.env` to `app/.gitignore`.
- New `src/config.ts` (single `API_URL` constant), `src/supabase.ts` (client with AsyncStorage adapter, autoRefresh), `src/client.ts` (`api<T>()` per guide §1, `ApiError(status, detail)`, 401 → sign out).
- Rewrite `src/types.ts` to the guide's snake_case API types (§5) plus small UI helpers; add `src/endpoints.ts` with one typed function per endpoint (logs, home, themes, chats, pieces, styles, drafts).

## Step 3 — Auth (S02)
- `sign-in.tsx:323`: Google OAuth via `supabase.auth.signInWithOAuth` + `expo-web-browser` (redirect scheme `echo`), then `GET /me`.
- Store: `signedIn` derives from `supabase.auth.onAuthStateChange`; `Stack.Protected` in `_layout.tsx` keeps gating. Keep only `onboarded` local.

## Step 4 — Store refactor
`store.tsx` stops owning logs/themes/chats/drafts/pieces/styles as persisted state and `seed.ts` demo data. Screens load from the API (small `useQuery`-style hook with loading/error/refetch, no new library) and mutate through `endpoints.ts`. Keep local: `onboarded`, `dismissedNoticeFor`, merge "keep separate", ask suggestions, post ideas. Remove `newId`, `signIn` seeding, `echo-state.json` persistence of server data.

## Step 5 — Screen wiring (per guide §3)
- Home → `GET /home` (hide weekSummary; nudge from API).
- Capture/Listening → keep on-device Whisper; `POST /logs` replaces `analyzeLog` (`capture.tsx:103`, `write.tsx:29`); drive checklist from `steps`. Logs are saved by the server, so the "Save" on S06 becomes a no-op/navigate; Discard has no delete endpoint → just navigate back (note in summary).
- Log result `log/[id].tsx` → `GET /logs/{id}`, `POST/DELETE /logs/{id}/themes`; related from `log.related`.
- Logs list → `GET /logs?q=&before=` with paging; Themes → `GET /themes`, `GET /themes/{id}`, `/report` (map `then/now/shifts/open_question`, handle `not_enough_history`).
- Chats → `POST /chats`, `/chats/{id}/messages`, `GET /chats[/{id}]`; citations render from `citations`, handle `supported:false`.
- Write mode: `GET /styles`, `GET /drafts?status=`; upload.tsx → `POST/GET/DELETE /pieces` (real file read via document-picker for .md/.txt; drop `importLink`/fake `addFile`); analyze.tsx:33 → `POST /styles/analyze`; styles screens → `/styles/merge` (no undo), `PATCH /styles/{id}`, `PATCH /pieces/{id}`; chat.tsx:60 → `POST /drafts` (`kind` lowercase, `style_id:null` = Let Echo choose); draft editor → `GET/PUT /drafts/{id}` (2 s debounced autosave), `/revise` (incl. selection), `/restyle`, `/save`, `/publish`, `/versions`; drop per-style `texts` cache.
- Delete `src/api.ts` mocks and `seed.ts` once unused.

## Step 6 — Errors/loading
Shared handling per guide §2: 401 → sign-in, 404 → "not found", 400/500 → show `detail` with retry; spinners for slow calls (logs 2–6 s, report, analyze 10–30 s, drafts).

## Step 7 — Commit
One commit per step group (foundation+auth, store+screens), explicit staging, no Co-Authored-By.

## Verification
- `cd app && npx tsc --noEmit` clean.
- Rebuild dev client, run against backend (`--host 0.0.0.0`, seeded demo account): sign in with Google → Home shows 18 logs/themes; record + typed log saves and shows steps; theme report; Ask returns cited answer; upload piece → analyze → styles; create post → edit/revise/save/publish.
- `git log` shows no Co-Authored-By; `git status` clean of `node_modules`.

## Needs from user at implementation time
Real values for `EXPO_PUBLIC_API_URL`, Supabase URL and anon key, and Google OAuth redirect configured in Supabase.
