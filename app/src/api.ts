// Mock stand-in for the FastAPI backend (doc-ignore/BACKEND_PLAN.md). Every function is async and
// returns backend-shaped data, so each one can later become a fetch() without touching the screens.
import type { Citation, Draft, DraftCategory, Log, MergeSuggestion, Piece, Style, Theme, ThemeReport } from './types';

const MOCK_DELAY_MS = 600;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STOP = new Set(
  'the a an and or but i im i\'m me my to of in on at for it is was that this so just like with be been not no you your we our they them he she what when how about from as are were have had has do did can will would'.split(
    ' ',
  ),
);

const wait = () => new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  a.forEach((w) => b.has(w) && n++);
  return n;
};

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const clip = (text: string, maxWords: number) => {
  const w = text.split(/\s+/);
  return w.length <= maxWords ? text : `${w.slice(0, maxWords).join(' ')}…`;
};

export const isThisWeek = (iso: string) => Date.now() - new Date(iso).getTime() < WEEK_MS;

/** POST /entries: title, summary, key points and suggested themes for a transcript. */
export async function analyzeLog(
  transcript: string,
  themes: Theme[],
  logs: Log[],
): Promise<Pick<Log, 'title' | 'summary' | 'keyPoints' | 'themeIds'>> {
  await wait();
  const s = sentences(transcript);
  const w = words(transcript);
  const themeIds = themes
    .map((t) => {
      const text = [t.name, ...logs.filter((l) => l.themeIds.includes(t.id)).map((l) => l.transcript)].join(' ');
      return { id: t.id, score: overlap(w, words(text)) };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.id);
  return {
    title: clip((s[s.length - 1] ?? transcript).replace(/[.!?]$/, ''), 8),
    summary: clip(s.slice(0, 2).join(' '), 40),
    keyPoints: s.slice(0, 3).map((p) => clip(p, 16)),
    themeIds,
  };
}

/** Earlier logs on the same thread: shared themes first, then shared words. */
export async function relatedLogs(log: Pick<Log, 'id' | 'transcript' | 'themeIds'>, logs: Log[]): Promise<Log[]> {
  await wait();
  const w = words(log.transcript);
  return logs
    .filter((l) => l.id !== log.id && l.saved)
    .map((l) => ({
      l,
      score: l.themeIds.filter((t) => log.themeIds.includes(t)).length * 10 + overlap(w, words(l.transcript)),
    }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.l);
}

export type WeekSummary = { count: number; topThemes: Theme[]; line: string };

export function weekSummary(logs: Log[], themes: Theme[]): WeekSummary {
  const week = logs.filter((l) => l.saved && isThisWeek(l.createdAt));
  const counts = new Map<string, number>();
  week.forEach((l) => l.themeIds.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  const topThemes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => themes.find((t) => t.id === id))
    .filter((t): t is Theme => !!t);
  const line = !week.length
    ? 'Nothing captured yet this week. Say a thought out loud.'
    : topThemes.length
      ? `Mostly about ${topThemes.map((t) => t.name.toLowerCase()).join(' and ')}. Latest: “${week[0].title}”.`
      : `Latest: “${week[0].title}”.`;
  return { count: week.length, topThemes, line };
}

/** "Echo noticed": a theme you came back to at least twice this week. */
export function noticed(logs: Log[], themes: Theme[]): { theme: Theme; count: number } | null {
  const week = logs.filter((l) => l.saved && isThisWeek(l.createdAt));
  let best: { theme: Theme; count: number } | null = null;
  for (const t of themes) {
    const count = week.filter((l) => l.themeIds.includes(t.id)).length;
    if (count >= 2 && (!best || count > best.count)) best = { theme: t, count };
  }
  return best;
}

/** GET /themes/{id}/report: how thinking on a theme changed, oldest first. */
export async function themeReport(theme: Theme, logs: Log[]): Promise<ThemeReport> {
  await wait();
  const own = logs
    .filter((l) => l.saved && l.themeIds.includes(theme.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!own.length) return { summary: 'No logs in this theme yet.', shifts: [] };
  const first = own[0];
  const last = own[own.length - 1];
  return {
    summary:
      own.length === 1
        ? `One log so far: ${first.summary}`
        : `Across ${own.length} logs, you moved from “${first.title}” to “${last.title}”.`,
    shifts: own.map((l) => ({ date: l.createdAt, text: l.summary, logId: l.id })),
  };
}

/** POST /ask: answer only from the given logs and cite them as [n]. */
export async function ask(question: string, logs: Log[]): Promise<{ answer: string; citations: Citation[] }> {
  await wait();
  const q = words(question);
  const hits = logs
    .filter((l) => l.saved)
    .map((l) => ({ l, score: overlap(q, words(`${l.title} ${l.transcript}`)) }))
    .filter((x) => x.score > 0 || logs.length <= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (!hits.length) return { answer: "That isn't in your logs yet.", citations: [] };
  const citations = hits.map(({ l }, i) => ({
    n: i + 1,
    logId: l.id,
    title: l.title,
    date: l.createdAt,
    snippet: clip(l.summary, 20),
  }));
  const answer = citations.map((c) => `${c.snippet} [${c.n}]`).join(' ');
  return { answer, citations };
}

/** POST /drafts: a first draft from selected logs. The real one uses the voice profile. */
export async function draftFrom(logs: Log[], style: Style | undefined): Promise<Pick<Draft, 'title' | 'text'>> {
  await wait();
  const [lead, ...rest] = logs;
  if (!lead) return { title: 'Untitled draft', text: '' };
  const category = style?.category ?? 'LinkedIn';
  const lines = [lead.summary, ...lead.keyPoints, ...rest.map((l) => l.summary)].flatMap(sentences);
  if (category === 'LinkedIn') {
    return { title: lead.title, text: `${lines.join('\n\n')}\n\nIf you're waiting to feel ready: start small.` };
  }
  if (category === 'Story') {
    return { title: lead.title, text: `${lines.slice(0, 3).join('\n\n')}\n\nTwo hours later it was merged.` };
  }
  return { title: lead.title, text: `${lead.title}\n\n${lines.join(' ')}` };
}

/** POST /drafts/revise: apply a quick instruction ("Shorter", "More casual", …) to a draft. */
export async function reviseDraft(text: string, instruction: string): Promise<string> {
  await wait();
  const parts = text.split(/\n{2,}/).filter(Boolean);
  const ask = instruction.toLowerCase();
  if (ask.includes('short')) return parts.slice(0, Math.max(1, Math.ceil(parts.length / 2))).join('\n\n');
  if (ask.includes('hook')) return `Nobody tells you this.\n\n${text}`;
  if (ask.includes('casual')) return text.replace(/\bdo not\b/g, "don't").replace(/\bI am\b/g, "I'm");
  if (ask.includes('question')) return `${text}\n\nWhat was your on-ramp?`;
  return text;
}

/** POST /styles/analyze: file new pieces under a style (by where they came from), creating one if needed. */
export async function analyzeWriting(
  pieces: Piece[],
  styles: Style[],
): Promise<{ styles: Style[]; suggestion: MergeSuggestion | null }> {
  await wait();
  const next = styles.map((s) => ({ ...s, pieceIds: [...s.pieceIds] }));
  for (const p of pieces.filter((x) => !x.analyzed)) {
    const category: DraftCategory = /medium|blog|\.docx|\.pdf/i.test(p.source)
      ? 'Blog'
      : /thread|x ·/i.test(p.source)
        ? 'Story'
        : 'LinkedIn';
    let target = next.find((s) => s.category === category);
    if (!target) {
      target = {
        id: `st-${category.toLowerCase()}-${Date.now().toString(36)}`,
        name: category === 'LinkedIn' ? 'LinkedIn posts' : category === 'Blog' ? 'Articles' : 'Threads',
        where: category === 'LinkedIn' ? 'LinkedIn' : category === 'Blog' ? 'your blog' : 'X and Threads',
        traits: ['Learned from your uploads'],
        sample: p.title,
        category,
        pieceIds: [],
      };
      next.push(target);
    }
    target.pieceIds.push(p.id);
  }
  const a = next.find((x) => next.some((y) => y.id !== x.id && y.category === x.category));
  const b = a && next.find((y) => y.id !== a.id && y.category === a.category);
  const suggestion: MergeSuggestion | null =
    a && b ? { keepId: a.id, mergeId: b.id, reason: 'Both read alike in tone, length and structure.', status: 'open' } : null;
  return { styles: next, suggestion };
}

/** POST /pieces/import: fetch the public posts behind a URL. */
export async function importLink(url: string): Promise<Piece[]> {
  await wait();
  const host = url.replace(/^https?:\/\//, '').split('/')[0] || 'link';
  return [{ id: `pc-${Date.now().toString(36)}`, title: `Recent posts from ${host}`, source: 'Link · 5 posts', words: 900, analyzed: false }];
}
