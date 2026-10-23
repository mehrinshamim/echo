# Echo — on-device transcription test

Minimal React Native (Expo dev build) app that records from the mic and transcribes **on the phone** with whisper.cpp (via `whisper.rn`). English only. Not usable in Expo Go (native module).

## One-time setup
1. Install **JDK 17** (JDK 25 is too new for this Gradle/RN version) and set `JAVA_HOME` to it.
2. Android Studio → SDK Manager: install Android SDK Platform, Build-Tools, and **NDK (Side by side)** + CMake. `ANDROID_HOME` should point at the SDK.
3. Phone: enable Developer options → USB debugging; connect via USB and accept the prompt. Check with `adb devices`.

## Run
```bash
cd app
npm install
npx expo run:android --device        # first build is slow (compiles whisper.cpp)
```
If it asks for a dev server later: `npx expo start --dev-client`.

## Test
1. Pick **tiny.en**, tap *Download / load* (needs internet once; ~75 MB).
2. Tap **Record**, speak 30 s, tap **Stop**. Repeat for ~60 s, and in a noisy place.
3. Read the stats line: `audio Xs · transcribed in Ys · RTF`. Pass ≈ 1 min audio in a few seconds (RTF well under 0.2) with readable text.
4. Repeat with **base.en**. Do ~10 recordings in a row and note phone heat / slowdown.
5. Send me the numbers. If it fails, we swap `transcribe()` in `src/transcribe.ts` for a hosted Whisper call.

## Troubleshooting
- Build error about NDK / "unknown host CPU": install NDK 24+ via SDK Manager.
- `Cannot find module whisper.rn`: imports use `whisper.rn/index` on purpose (the package has no root export).
- Mic silent / empty transcript: check Android permission for the app is granted.
