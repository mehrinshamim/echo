// Typed calls to the Echo backend (APP_API_GUIDE.md §4). Each function maps the snake_case JSON
// into the UI types in ./types so screens never see raw API shapes.
import { get, send } from './client';
import type {
  Analysis,
  Answer,
  Chat,
  Citation,
  Draft,
  DraftCategory,
  DraftStatus,
  DraftVersion,
  Home,
  Log,
  LogItem,
  LogSource,
  MergeSuggestion,
  Message,
  Piece,
  Platform,
  Style,
  StyleDetail,
  Theme,
  ThemeDetail,
  ThemeReport,
} from './types';

/* Raw shapes, as the backend sends them. */
type RThemeRef = { id: string; name: string };
type RTheme = { id: string; name: string; description: string | null; log_count: number; first_log_at: string | null; last_log_at: string | null };
type RLogItem = { id: string; title: string; created_at: string; duration_s: number | null; source: LogSource; primary_theme?: RThemeRef | null };
type RLog = RLogItem & {
  transcript: string;
  word_count: number;
  summary: string;
  key_points: string[];
  stance: string;
  themes: RThemeRef[];
  related: { log_id: string; date: string; title: string; theme: string | null; snippet: string; similarity: number }[];
  steps?: { themes_added: number; related_found: number };
};
type RCitation = { n: number; log_id: string; title: string; date: string; snippet: string };
type RAnswer = { chat_id: string; question: string; text: string; supported: boolean; citations: RCitation[] };
type RPiece = { id: string; style_id: string | null; title: string; source: string; source_label: string; word_count: number; created_at: string };
type RStyle = { id: string; name: string; traits: string[]; sample: string | null; where_used: string | null; updated_at: string; piece_count: number };
type RDraft = {
  id: string;
  kind: 'linkedin' | 'blog' | 'story';
  title: string;
  text?: string;
  prompt?: string | null;
  style_id: string | null;
  style_name: string | null;
  source_log_ids?: string[];
  source_logs?: { id: string; title: string; created_at: string }[];
  log_count?: number;
  status: DraftStatus;
  version: number;
  char_limit: number;
  platform: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
  saved_at: string | null;
  published_at: string | null;
  why?: string;
};

/* Mappers. */
const theme = (t: RTheme): Theme => ({
  id: t.id,
  name: t.name,
  description: t.description ?? undefined,
  logCount: t.log_count,
  firstLogAt: t.first_log_at ?? undefined,
  lastLogAt: t.last_log_at ?? undefined,
});

const logItem = (l: RLogItem): LogItem => ({
  id: l.id,
  createdAt: l.created_at,
  title: l.title,
  source: l.source,
  seconds: l.duration_s ?? undefined,
  primaryTheme: l.primary_theme ?? undefined,
});

const log = (l: RLog): Log => ({
  ...logItem(l),
  transcript: l.transcript,
  summary: l.summary,
  keyPoints: l.key_points,
  stance: l.stance,
  themes: l.themes,
  related: l.related.map((r) => ({
    logId: r.log_id,
    date: r.date,
    title: r.title,
    theme: r.theme ?? undefined,
    snippet: r.snippet,
  })),
  steps: l.steps && { themesAdded: l.steps.themes_added, relatedFound: l.steps.related_found },
});

const citation = (c: RCitation): Citation => ({ n: c.n, logId: c.log_id, title: c.title, date: c.date, snippet: c.snippet });

const answer = (a: RAnswer): Answer => ({
  chatId: a.chat_id,
  text: a.text,
  supported: a.supported,
  citations: a.citations.map(citation),
});

const piece = (p: RPiece, analyzed: boolean): Piece => ({
  id: p.id,
  title: p.title,
  source: p.source_label || p.source,
  words: p.word_count,
  styleId: p.style_id ?? undefined,
  analyzed,
});

const style = (s: RStyle): Style => ({
  id: s.id,
  name: s.name,
  where: s.where_used ?? '',
  traits: s.traits,
  sample: s.sample ?? '',
  pieceCount: s.piece_count,
});

const CATEGORY: Record<RDraft['kind'], DraftCategory> = { linkedin: 'LinkedIn', blog: 'Blog', story: 'Story' };
const KIND: Record<DraftCategory, RDraft['kind']> = { LinkedIn: 'linkedin', Blog: 'blog', Story: 'story' };
const PLATFORM: Record<string, Platform> = { linkedin: 'LinkedIn', blog: 'Blog', other: 'Other' };

const draft = (d: RDraft): Draft => ({
  id: d.id,
  category: CATEGORY[d.kind],
  title: d.title,
  text: d.text ?? '',
  prompt: d.prompt ?? undefined,
  logIds: d.source_log_ids ?? d.source_logs?.map((l) => l.id) ?? [],
  sourceLogs: (d.source_logs ?? []).map((l) => ({ id: l.id, title: l.title, createdAt: l.created_at })),
  logCount: d.log_count ?? d.source_log_ids?.length ?? d.source_logs?.length ?? 0,
  styleId: d.style_id ?? undefined,
  styleName: d.style_name ?? undefined,
  status: d.status,
  version: d.version,
  charLimit: d.char_limit,
  platform: d.platform ? PLATFORM[d.platform] ?? 'Other' : undefined,
  url: d.url ?? undefined,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
  savedAt: d.saved_at ?? undefined,
  publishedAt: d.published_at ?? undefined,
  why: d.why,
});

/* Auth */
export const me = () => get<{ user_id: string }>('/me');

/* Home and themes */
export async function home(): Promise<Home> {
  const h = await get<{
    counts: Home['counts'];
    themes: RTheme[];
    nudge: { theme_id: string; theme_name: string; count: number; window: string; message: string } | null;
  }>('/home');
  return {
    counts: h.counts,
    themes: h.themes.map(theme),
    nudge: h.nudge && {
      themeId: h.nudge.theme_id,
      themeName: h.nudge.theme_name,
      count: h.nudge.count,
      window: h.nudge.window,
      message: h.nudge.message,
    },
  };
}

export const themes = async () => (await get<RTheme[]>('/themes')).map(theme);

export async function themeDetail(id: string): Promise<ThemeDetail> {
  const t = await get<RTheme & { logs: RLogItem[] }>(`/themes/${id}`);
  return {
    ...theme(t),
    logs: t.logs.map((l) => ({ id: l.id, title: l.title, createdAt: l.created_at, seconds: l.duration_s ?? undefined, source: l.source })),
  };
}

export async function themeReport(id: string): Promise<ThemeReport> {
  type RCite = { quote?: string; text?: string; log_id: string; date: string; title: string };
  const r = await get<{
    status: 'ok' | 'not_enough_history';
    log_count: number;
    report: { overview: string; then: RCite; now: RCite; shifts: RCite[]; open_question: string } | null;
  }>(`/themes/${id}/report`);
  if (r.status !== 'ok' || !r.report) return { status: 'not_enough_history', logCount: r.log_count };
  const cite = (c: RCite) => ({ logId: c.log_id, date: c.date, title: c.title });
  return {
    status: 'ok',
    logCount: r.log_count,
    overview: r.report.overview,
    then: { ...cite(r.report.then), quote: r.report.then.quote ?? '' },
    now: { ...cite(r.report.now), quote: r.report.now.quote ?? '' },
    shifts: r.report.shifts.map((s) => ({ ...cite(s), text: s.text ?? '' })),
    openQuestion: r.report.open_question,
  };
}

/* Logs */
export async function saveLog(input: { text: string; title?: string; seconds?: number; source: LogSource }): Promise<Log> {
  return log(
    await send<RLog>('POST', '/logs', {
      text: input.text,
      title: input.title || null,
      duration_s: input.seconds ? Math.round(input.seconds) : null,
      source: input.source,
    }),
  );
}

export async function logs(opts: { q?: string; before?: string } = {}): Promise<LogItem[]> {
  const qs = new URLSearchParams();
  if (opts.q) qs.set('q', opts.q);
  if (opts.before) qs.set('before', opts.before);
  const query = qs.toString();
  return (await get<RLogItem[]>(`/logs${query ? `?${query}` : ''}`)).map(logItem);
}

export const getLog = async (id: string) => log(await get<RLog>(`/logs/${id}`));
export const renameLog = async (id: string, title: string) => log(await send<RLog>('PATCH', `/logs/${id}`, { title }));
export const addLogTheme = async (id: string, name: string) => log(await send<RLog>('POST', `/logs/${id}/themes`, { name }));
export const removeLogTheme = async (id: string, themeId: string) => log(await send<RLog>('DELETE', `/logs/${id}/themes/${themeId}`));

/* Chats */
export async function createChat(question: string, themeIds: string[], logIds: string[]): Promise<Answer> {
  return answer(await send<RAnswer>('POST', '/chats', { question, theme_ids: themeIds, log_ids: logIds }));
}

export const askFollowUp = async (chatId: string, question: string) =>
  answer(await send<RAnswer>('POST', `/chats/${chatId}/messages`, { question }));

type RChatItem = { id: string; title: string; theme_ids: string[]; log_ids: string[]; updated_at: string };
const chat = (c: RChatItem): Chat => ({ id: c.id, title: c.title, themeIds: c.theme_ids, logIds: c.log_ids, updatedAt: c.updated_at, messages: [] });

export const chats = async () => (await get<RChatItem[]>('/chats')).map(chat);

export async function getChat(id: string): Promise<Chat> {
  const c = await get<RChatItem & { messages: { role: 'user' | 'assistant'; text: string; citations?: RCitation[] }[] }>(`/chats/${id}`);
  const messages: Message[] = c.messages.map((m) => ({ role: m.role, text: m.text, citations: m.citations?.map(citation) }));
  return { ...chat(c), messages };
}

/* Writing pieces and styles */
export async function addPieces(items: { text: string; title?: string; label: string }[]): Promise<Piece[]> {
  const created = await send<RPiece[]>('POST', '/pieces', {
    items: items.map((i) => ({ text: i.text, title: i.title ?? null, source_label: i.label })),
  });
  return created.map((p) => piece(p, false));
}

export const pendingPieces = async () => (await get<RPiece[]>('/pieces')).map((p) => piece(p, false));
export const deletePiece = (id: string) => send<{ ok: boolean }>('DELETE', `/pieces/${id}`);
export const movePiece = async (id: string, styleId: string) => piece(await send<RPiece>('PATCH', `/pieces/${id}`, { style_id: styleId }), true);

export const styles = async () => (await get<RStyle[]>('/styles')).map(style);

export async function analyzeWriting(): Promise<Analysis> {
  const r = await send<{ pieces_read: number; styles: RStyle[]; merge_suggestion: { a: string; b: string; reason: string } | null }>(
    'POST',
    '/styles/analyze',
  );
  const mergeSuggestion: MergeSuggestion | null = r.merge_suggestion && {
    keepId: r.merge_suggestion.a,
    mergeId: r.merge_suggestion.b,
    reason: r.merge_suggestion.reason,
    status: 'open',
  };
  return { piecesRead: r.pieces_read, styles: r.styles.map(style), mergeSuggestion };
}

export async function styleDetail(id: string): Promise<StyleDetail> {
  const s = await get<RStyle & { pieces: RPiece[] }>(`/styles/${id}`);
  return { ...style(s), pieces: s.pieces.map((p) => piece(p, true)) };
}

export async function renameStyle(id: string, name: string): Promise<StyleDetail> {
  const s = await send<RStyle & { pieces: RPiece[] }>('PATCH', `/styles/${id}`, { name });
  return { ...style(s), pieces: (s.pieces ?? []).map((p) => piece(p, true)) };
}

export async function mergeStyles(keepId: string, mergeId: string): Promise<Style> {
  return style(await send<RStyle>('POST', '/styles/merge', { keep_id: keepId, merge_id: mergeId }));
}

/* Drafts */
export const kindOf = (category: DraftCategory) => KIND[category];

export async function createDraft(input: {
  prompt: string;
  styleId?: string;
  logIds: string[];
  themeIds: string[];
  category: DraftCategory;
}): Promise<Draft> {
  return draft(
    await send<RDraft>('POST', '/drafts', {
      prompt: input.prompt,
      style_id: input.styleId ?? null,
      log_ids: input.logIds,
      theme_ids: input.themeIds,
      kind: KIND[input.category],
    }),
  );
}

export const drafts = async (status: DraftStatus) => (await get<RDraft[]>(`/drafts?status=${status}`)).map(draft);
export const getDraft = async (id: string) => draft(await get<RDraft>(`/drafts/${id}`));
export const editDraft = async (id: string, text: string) => draft(await send<RDraft>('PUT', `/drafts/${id}`, { text }));

export const reviseDraft = async (id: string, instruction: string, selection?: { start: number; end: number }) =>
  draft(await send<RDraft>('POST', `/drafts/${id}/revise`, selection ? { instruction, selection } : { instruction }));

export const restyleDraft = async (id: string, styleId: string) => draft(await send<RDraft>('POST', `/drafts/${id}/restyle`, { style_id: styleId }));

export async function draftVersions(id: string): Promise<DraftVersion[]> {
  const v = await get<{ n: number; text: string; author: 'ai' | 'user'; instruction: string | null; created_at: string }[]>(`/drafts/${id}/versions`);
  return v.map((x) => ({ n: x.n, text: x.text, author: x.author, instruction: x.instruction ?? undefined, createdAt: x.created_at }));
}

export const saveDraft = async (id: string) => draft(await send<RDraft>('POST', `/drafts/${id}/save`));

export async function publishDraft(id: string, platform: Platform, url?: string): Promise<Draft> {
  return draft(await send<RDraft>('POST', `/drafts/${id}/publish`, { platform: platform.toLowerCase(), url: url ?? null }));
}
