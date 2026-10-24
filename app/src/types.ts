// Shapes follow doc-ignore/BACKEND_PLAN.md (entries = logs) so the mock api can be swapped for real calls.

export type Log = {
  id: string;
  createdAt: string; // ISO
  title: string;
  transcript: string;
  summary: string;
  keyPoints: string[];
  themeIds: string[];
  source: 'voice' | 'typed' | 'mixed';
  saved: boolean; // false while it is still a Result the user has not saved
};

export type Theme = { id: string; name: string; createdAt: string };

export type Citation = { n: number; logId: string; title: string; date: string; snippet: string };

export type Message = { role: 'user' | 'assistant'; text: string; citations?: Citation[] };

export type Chat = {
  id: string;
  createdAt: string;
  title: string;
  themeIds: string[];
  logIds: string[];
  styleId?: string; // writing style chosen with "+ Style"
  messages: Message[];
};

export type DraftCategory = 'LinkedIn' | 'Blog' | 'Story';

export type DraftStatus = 'draft' | 'saved' | 'published';
export type Platform = 'LinkedIn' | 'Blog' | 'Other';

/** One piece of the user's past writing (a post, article or thread) that styles are learned from. */
export type Piece = {
  id: string;
  title: string;
  source: string; // e.g. "LinkedIn · published 14 Oct", "Pasted · 220 words"
  words: number;
  analyzed: boolean; // false while it waits on the Upload screen
};

export type Style = {
  id: string;
  name: string;
  where: string; // where it is used, e.g. "mostly LinkedIn"
  traits: string[];
  sample: string;
  category: DraftCategory;
  pieceIds: string[];
};

/** Echo noticed two styles read alike. `removed` is kept after a merge so Undo can restore it. */
export type MergeSuggestion = {
  keepId: string;
  mergeId: string;
  reason: string;
  status: 'open' | 'merged' | 'kept';
  removed?: Style;
  /** Drafts and chats that were moved to `keepId` by the merge, so Undo can point them back. */
  moved?: { draftIds: string[]; chatIds: string[] };
};

export type Draft = {
  id: string;
  createdAt: string;
  category: DraftCategory;
  title: string;
  text: string;
  logIds: string[];
  status: DraftStatus;
  version: number;
  styleId?: string;
  texts?: Record<string, string>; // edited text per style, so switching style chips keeps edits
  platform?: Platform;
  url?: string; // where it was posted, optional
  publishedAt?: string;
  savedAt?: string;
};

export type ThemeReport = { summary: string; shifts: { date: string; text: string; logId: string }[] };

export type State = {
  onboarded: boolean;
  user: { name: string; email: string } | null;
  logs: Log[];
  themes: Theme[];
  chats: Chat[];
  drafts: Draft[];
  pieces: Piece[];
  styles: Style[];
  mergeSuggestion: MergeSuggestion | null;
  dismissedNoticeFor: string | null; // theme id whose "Echo noticed" card was dismissed
};
