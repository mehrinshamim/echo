# Echo

**Speak your thoughts. Echo remembers, connects them, and helps you write.**

Echo is a voice-first journaling and writing companion for your phone. You talk, Echo transcribes on your device, and a backend turns the text into summaries, recurring themes, answers with citations, and drafts written in your own voice.

## The idea

Most of our best ideas are said out loud, then forgotten. Notes apps store text but never connect it. Echo is built around three ideas:

1. **Capture without friction.** Tap, talk, done. Transcription runs on-device with Whisper, so audio never leaves the phone and only text is sent to the server.
2. **Your thoughts echo back.** Each log is summarized, tagged with themes and embedded. When you say something you have said before, Echo surfaces the earlier entries ("echoes"). Themes get an evolution report that shows how your thinking changed over time.
3. **Turn thoughts into writing.** Echo learns a voice profile per category (e.g. LinkedIn, essay) from your own samples. It then drafts, revises and publishes posts that sound like you, grounded in what you actually logged.

You can also ask Echo questions about your own history. Answers come with citations to the entries they were drawn from.

## Features

- Voice capture with on-device transcription
- Automatic summaries, themes and recurring-thought echoes
- Home feed, per-log view and theme view with an evolution report
- Chat with your logs (RAG with cited answers)
- Writing studio: voice-profile learning from samples, draft generation, revise and suggest, publish
- Google sign-in; per-user data isolation with row-level security

## Tech stack

| Layer | Tools |
|---|---|
| Mobile app (`app/`) | Expo (dev build), React Native, TypeScript, Expo Router |
| On-device speech | `whisper.rn` (whisper.cpp, `base.en`), `@fugood/react-native-audio-pcm-stream` for mic PCM, `expo-file-system` for model storage |
| Auth & client data | Supabase Auth (Google sign-in), `@supabase/supabase-js`, AsyncStorage |
| Backend (`backend/`) | Python 3.12, FastAPI (async), Pydantic settings, Uvicorn, managed with `uv` |
| Database (`backend/supabase/`) | Supabase Postgres, pgvector (HNSW indexes), SQL functions `match_chunks` / `match_entries`, row-level security |
| AI | OpenAI-compatible client with Gemini (dev), OpenAI (demo) and Groq (backup chat); separate fast/smart model tiers and embeddings |
| Deploy & testing | Render blueprint (`backend/render.yaml`), Bruno API collection (`backend/bruno/`) |

## Repository layout

```
app/                        Expo app (screens in src/app, recorder.ts, transcribe.ts, api.ts)
backend/                    everything server-side
  app/                      FastAPI service (routes, llm.py, prompts.py, config.py)
  scripts/                  demo seeding and helpers
  supabase/                 schema.sql and migrations
  bruno/                    API request collection for manual testing
  ARCHITECTURE.md           how it all fits together, flow by flow
  APP_API_GUIDE.md          API reference for the app
  API.md                    short API summary
  render.yaml               Render deployment blueprint (set rootDir to backend)
```

## Architecture in brief

```
Phone (Expo) ── mic → whisper.rn (on-device) ── text + JWT ──► FastAPI ──► Supabase (Postgres + pgvector)
                                                                  └──────► LLM / embedding providers
```

Features are fixed pipelines (load data, make one or two structured LLM calls, save) rather than autonomous agents, which keeps them predictable, cheap and easy to debug. See [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) for details.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env      # fill in Supabase and LLM provider keys
uv sync
uv run uvicorn app.main:app --reload
```

Apply `backend/supabase/schema.sql` (and any migrations) to your Supabase project first. See [backend/README.md](backend/README.md) for migrations, demo seeding and Bruno usage.

### App

Echo needs a dev build, because `whisper.rn` is a native module and does not work in Expo Go.

```bash
cd app
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo run:android      # or: npx expo run:ios
npx tsc --noEmit          # type check
```

See [app/README.md](app/README.md) for run and test steps.

## Status

Built as a hackathon project. The backend (logs, home, themes, chats, styles, drafts) and the app screens are wired together; auth callback handling is the latest addition.
