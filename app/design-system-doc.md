# Echo Design System

Source: Claude Design project "Echo Mobile", section **6** ("5c, built out: the screens and the design system for handoff"), option **6a** (17 frames), plus section **7** ("Write mode, rebuilt", option **7a**, frames W1–W14), which replaces frames 16 and 17 and adds "+ Style" to the chat frames.
Values marked **(derived)** are not in the spec; they were chosen to fill gaps and should stay consistent with it.

This doc directs the code. `src/theme.ts` mirrors the token tables below 1:1, and screens use the components in `src/ui/`.

---

## 1. Principles

1. **One fixed color per section.** Logs are blue, Themes are pink, Chats are green, Styles are yellow, and actions (Capture, Save) are ink. Published posts use an ink timeline. Never pick a color outside these.
2. **Light fill for surfaces, strong tone for lines.** Each section uses its light *fill* for surfaces and its strong *line* tone for timeline lines, dots and bullets.
3. **Text is always ink on the light fill**, never on the strong tone.
4. **Clear text.** No italics, no font weight under 500, nothing rotated, no text on top of decorative shapes. There are no decorative blobs.
5. **Outlined, flat UI.** Every card and control has a 1.5px ink border. A shadow appears only on floating bars (the Capture bar).
6. **Big targets.** Every tap target is 44px or larger.

## 2. Color tokens

| Token (`colors.`) | Value | Use |
|---|---|---|
| `logs.fill` | `#bcd4f6` | Log surfaces, Logs tile, citation pills |
| `logs.line` | `#2f6fd0` | Logs timeline line and dots |
| `themes.fill` | `#f7b6d6` | Theme chips, the theme card top strip, Themes tile |
| `themes.line` | `#c93d84` | Theme timeline line and dots |
| `chats.fill` | `#b9dfa8` | Chat surfaces, context chips, Chats tile |
| `chats.line` | `#3f8a2c` | Chat accents |
| `styles.fill` | `#f6dd8f` | Style chips, merge card chips, done steps in Analyze |
| `styles.line` | `#a57a10` | Style card top strip |
| `styles.tint` | `#fbf3d6` | Selected row in the style picker sheet |
| `ink` | `#141414` | Text, borders, primary buttons, the Write mode header |
| `textSecondary` | `#45413b` | Meta text, dates, counts |
| `placeholder` | `#5c574f` | Input placeholders |
| `bg` | `#f6f1e8` | App background |
| `card` | `#ffffff` | Cards, inputs, secondary buttons |
| `divider` | `rgba(20,20,20,0.15)` | 1px dividers |
| `focus` | `#2f6fd0` | 3px focus ring |
| `onInk` | `#ffffff` (derived) | Text on ink surfaces |

**Write mode:** an ink header bar (`ink` background, `onInk` text) marks the switch into writing.

## 3. Typography

Archivo is the only family. In React Native, each weight is its own font family name.

| Token (`type.`) | Size | Weight → family | Line height | Letter spacing |
|---|---|---|---|---|
| `h1` | 32 (range 28–36) | 800 → `Archivo_800ExtraBold` | 1.1 × size | −0.02em (−0.64) |
| `h1Lg` | 36 (onboarding) | 800 | 1.05 × size | −0.02em |
| `h2` | 19 | 800 | 24 | 0 |
| `body` | 16 (range 16–17) | 500 → `Archivo_500Medium` | 1.5 × size (range 1.45–1.6) | 0 |
| `bodyStrong` | 16 | 600 → `Archivo_600SemiBold` | 24 | 0 |
| `meta` | 14 (range 14–15) | 600, in `textSecondary` | 20 | 0 |
| `button` | 16 (range 15–16) | 700 → `Archivo_700Bold` | 20 | 0 |
| `label` (derived) | 13 | 700, uppercase-free | 16 | 0 |

## 4. Shape

| Token | Value |
|---|---|
| `border.width` | 1.5, `ink` on every card and control |
| `radius.card` | 20 |
| `radius.tile` | 16 (range 14–16) |
| `radius.pill` | height / 2 (use 999) |
| `divider` | 1px `divider` color |
| `shadow.float` | Capture bar only: offset y 6, blur 16, ink at 18% opacity, Android elevation 8 (derived values) |
| Theme card | a white card with a **6px `themes.fill` top strip** |
| Timeline | a **2px line** plus **12px dots** in the section's `line` color (Published posts: ink) |
| Style card | a white card with a **6px `styles.line` top strip**; 148 wide in the horizontal row |
| Dashed | 1.5px **dashed** ink border for "add" actions (+ Style, + Log) and the merge suggestion card |

## 5. Spacing and sizes (derived)

| Token (`space.`) | 4 · 8 · 12 · 16 · 20 · 24 · 32 → `xs s m l xl xxl xxxl` |
|---|---|
| Screen gutter | 20 |
| Gap between cards | 12 |
| Card padding | 16 |

| Token (`size.`) | Value |
|---|---|
| `tap` | 44 (minimum) |
| `btnPrimary` | 56 (range 52–58) |
| `btnSecondary` | 48 (range 44–56) |
| `back` | 44 |
| `chip` | 38 (range 36–40) |
| `citation` | 24 |
| `dot` | 12 |
| `focusRing` | 3 |

## 6. Components (`src/ui/`)

| Component | File | Spec |
|---|---|---|
| Primary button | `Button.tsx` `variant="primary"` | `ink` fill pill, `onInk` text, 56 tall, `button` type |
| Secondary button | `Button.tsx` `variant="secondary"` | `card` fill pill, 1.5px ink border, 48 tall |
| Back | `BackPill.tsx` | 44 tall outlined pill with a ← icon and a label ("Back" or the parent screen's name) |
| Segmented tabs | `Segmented.tsx` | Bordered pill bar; the selected segment is ink with `onInk` text, the others are transparent with ink text |
| Chip | `Chip.tsx` | 38 tall pill with a 1.5px ink border and its type's `fill` (theme, log or chat); optional × to remove, or a "+" add variant |
| Citation | `CitationPill.tsx` | 24 tall pill in `logs.fill` showing `[n]`; tapping opens the cited log |
| Card | `Card.tsx` | `card` fill, 1.5px ink border, `radius.card`, 16 padding |
| Theme card | `ThemeCard.tsx` | Card plus a 6px `themes.fill` top strip; theme name (h2), count and last activity (meta) |
| Timeline | `Timeline.tsx` | Vertical 2px line and 12px dots in the section's `line` color; each row shows a date (meta), a title (bodyStrong) and a summary (body) |
| Section tile | `SectionTile.tsx` | Tile (`radius.tile`) in a section's `fill` with a 1.5px ink border; title, count and icon |
| Capture bar | `CaptureBar.tsx` | Floating docked bar: card fill, border, `shadow.float`. Holds a "Type a log…" field (tap → WriteLog) and an ink "Capture" pill with a mic icon |
| Style card | `StyleCard.tsx` | Card plus a 6px `styles.line` top strip; style name (bodyStrong) and piece count (meta) |
| Bottom sheet | `BottomSheet.tsx` | Backdrop, grabber, title and × close; used by "Write it like…" and "Finish this post" |
| Dashed chip | `Chip.tsx` `dashed` | Transparent fill, dashed border; "+ Style", "+ Log" |
| Header | `Header.tsx` | Back pill on the left, title, and an optional right action. A `mode="write"` variant uses an ink bar |

**Icons (derived):** Feather from `@expo/vector-icons`, size 20 (22 in bars), always ink or `onInk`. Mapping: mic, pause, play, check, copy, edit-3 ("Type a log"), pen-tool (Write mode switch), x, plus, arrow-left, arrow-up (send), message-circle (chats), layers (themes), list (logs).

**Press state (derived):** opacity 0.7 while pressed. No animation beyond the native stack transitions.

## 7. Screens (6a frames → routes)

| # | Frame | Route | Section color | Key components |
|---|---|---|---|---|
| 01 | Onboarding | `/onboarding` | ink | h1Lg, primary "Get started" |
| 02 | Sign in with Google | `/sign-in` | ink | secondary "Continue with Google" |
| 03 | Home | `/` | all | Echo-noticed card, This-week card, 3 section tiles, Capture bar |
| 04 | Capture · recording | `/capture` | ink | timer, Pause/Resume, Done |
| 05 | Listening back | `/capture` (processing state) | ink | step list |
| 06 | Result · transcript + copy | `/log/[id]` tab `tx` | logs | Segmented, editable transcript, Copy pill |
| 07 | Result · themes, summary, key points | `/log/[id]` tab `sum` | themes | theme chips, summary, key points |
| 08 | Result · related logs | `/log/[id]` tab `rel` | logs | Timeline |
| 09 | WriteLog · typing | `/write` | logs | editor, Capture button |
| 10 | WriteLog · capture added below | `/write` | logs | appended transcript block |
| 11 | Logs · blue timeline | `/logs` | logs | Timeline grouped by date |
| 12 | Theme · how it changed | `/themes/[id]` tab `evo` | themes | evolution report |
| 13 | Theme · all logs | `/themes/[id]` tab `all` | themes | Timeline |
| 14 | New chat · + Theme / + Log / + Style | `/chats/[id]` | chats | context chips, input |
| 15 | Cited answer | `/chats/[id]` | chats | answer with Citation pills |
| W1 | Write home · drafts | `/write-mode` | ink header | Upload/New post buttons, style cards, Segmented tabs, draft cards |
| W2 | Write home · saved | `/write-mode` | ink header | saved cards with Copy / Mark published |
| W3 | Write home · published | `/write-mode` | ink header | ink timeline of published posts |
| W4 | Upload · paste | `/write-mode/upload` | ink header | source Segmented, textarea, pieces list |
| W5 | Upload · file | `/write-mode/upload` | ink header | Browse, pieces list |
| W6 | Analyzing your writing | `/write-mode/analyze` | styles | bars, step list |
| W7 | Styles · merge suggestion | `/write-mode/styles` | ink header | dashed merge card, style rows |
| W8 | Styles · after merge | `/write-mode/styles` | ink header | merged row with Undo |
| W9 | Style detail | `/write-mode/styles/[id]` | ink header | traits, sample, pieces |
| W10 | New post chat · + Style / + Log / + Theme | `/write-mode/chat` | ink header | ideas, composer |
| W11 | Style picker sheet | `/write-mode/chat` | ink header | bottom sheet |
| W12 | Draft · editable, switch style | `/write-mode/draft/[id]` | ink header | style chips, text, revisions, Built from |
| W13 | Finish · mark published | `/write-mode/draft/[id]` | ink header | bottom sheet |
| W14 | Ask chat · + Style | `/chats/[id]` | chats | "+ Style" chip beside + Theme / + Log |

(Frames 16 and 17 of section 6 are superseded by W1–W13.)

Also `/themes` (a list of Theme cards) and `/chats` (chat history).

## 8. UX flow

```
Onboarding ─Get started→ Sign in with Google → Home
Home
 ├ header: "echo" wordmark · edit icon → Write mode (context switch)
 ├ Echo noticed (dismissible) → Theme
 ├ This week: log count, top themes, one-line summary → Logs
 ├ Logs · Themes · Chats tiles (separate sections)
 └ Capture bar: [Type a log…] → WriteLog   [Capture] → Capture
Capture: recording → Done → Listening back → Result (unsaved log)
Result tabs: Transcript (editable + Copy) | Summary (editable theme chips, summary, key points) | Related → Save
WriteLog: type → Capture → transcript appended below the typed text → Done → Result
Logs → Log detail (the Result screen, saved)
Themes → Theme: How it changed | All logs
Chats → Chat: + Theme / + Log add context; answers cite logs [n] → Log
Write mode: ink header, drafts and a writing chat → Draft (Copy); the edit icon switches back
```

Copy: sections are called **Logs**, never "Notes". There is no calendar or events section.

## 9. Rules for code

- Never hardcode a hex value, font family, font size or radius in a screen. Import it from `src/theme.ts`.
- Build screens from `src/ui/` components. Add a component here first if a new pattern is needed.
- A surface takes its section's color: a log screen uses `logs.*`, a theme screen uses `themes.*`, a chat screen uses `chats.*`.
- Text color is `ink` or `textSecondary` only; on ink surfaces use `onInk`.
- Every pressable has a hit area of at least 44 (use `hitSlop` when the visual is smaller, e.g. the 24 citation pill).
