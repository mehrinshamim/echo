// UI-side shapes. src/api.ts maps the backend's snake_case JSON (APP_API_GUIDE.md §5) into these.

export type LogSource = 'voice' | 'typed' | 'mixed';

export type Theme = {
  id: string;
  name: string;
  description?: string;
  logCount: number;
  firstLogAt?: string;
  lastLogAt?: string;
};

/** A row in a list of logs (Logs, Home, pickers): no transcript. */
export type LogItem = {
  id: string;
  createdAt: string; // ISO
  title: string;
  source: LogSource;
  seconds?: number; // length of the voice capture, when there was one
  primaryTheme?: { id: string; name: string };
};

export type RelatedLog = { logId: string; date: string; title: string; theme?: string; snippet: string };

export type Log = LogItem & {
  transcript: string;
  summary: string;
  keyPoints: string[];
  stance: string;
  themes: { id: string; name: string }[];
  related: RelatedLog[];
  /** Only on the log just saved by POST /logs: the "Listening back" checklist counts. */
  steps?: { themesAdded: number; relatedFound: number };
};

export type Citation = { n: number; logId: string; title: string; date: string; snippet: string };

export type Message = { role: 'user' | 'assistant'; text: string; citations?: Citation[] };

export type Answer = { chatId: string; text: string; supported: boolean; citations: Citation[] };

export type Chat = {
  id: string;
  title: string;
  themeIds: string[];
  logIds: string[];
  styleId?: string; // writing style chosen with "+ Style"; used by "Make a post", not sent to the chat API
  updatedAt: string;
  /** Not on the server yet: the first question creates it (POST /chats) and replaces this entry. */
  local?: boolean;
  messages: Message[];
};

export type DraftCategory = 'LinkedIn' | 'Blog' | 'Story';

export type DraftStatus = 'draft' | 'saved' | 'published';
export type Platform = 'LinkedIn' | 'Blog' | 'Other';

/** One piece of the user's past writing (a post, article or thread) that styles are learned from. */
export type Piece = {
  id: string;
  title: string;
  source: string; // e.g. "Pasted", "talk-notes.md"
  words: number;
  styleId?: string; // set once analyzed
  analyzed: boolean; // false while it waits on the Upload screen
};

export type Style = {
  id: string;
  name: string;
  where: string; // where it is used, e.g. "mostly LinkedIn"
  traits: string[];
  sample: string;
  pieceCount: number;
};

export type StyleDetail = Style & { pieces: Piece[] };

/** Echo noticed two styles read alike. "Keep separate" is remembered only on the phone. */
export type MergeSuggestion = {
  keepId: string;
  mergeId: string;
  reason: string;
  status: 'open' | 'merged' | 'kept';
  /** Name of the style that was merged away, for the "Merged into" line. */
  mergedName?: string;
};

export type Draft = {
  id: string;
  category: DraftCategory;
  title: string;
  text: string;
  prompt?: string;
  logIds: string[];
  sourceLogs: { id: string; title: string; createdAt: string }[];
  logCount: number;
  styleId?: string;
  styleName?: string;
  status: DraftStatus;
  version: number;
  charLimit: number;
  platform?: Platform;
  url?: string;
  createdAt: string;
  updatedAt: string;
  savedAt?: string;
  publishedAt?: string;
  /** Present only on the response to POST /drafts: why Echo wrote it this way. */
  why?: string;
};

export type DraftVersion = { n: number; text: string; author: 'ai' | 'user'; instruction?: string; createdAt: string };

export type ThemeDetail = Theme & {
  logs: { id: string; title: string; createdAt: string; seconds?: number; source: LogSource }[];
};

type Cite = { logId: string; date: string; title: string };
export type ThemeReport =
  | { status: 'not_enough_history'; logCount: number }
  | {
      status: 'ok';
      logCount: number;
      overview: string;
      then: Cite & { quote: string };
      now: Cite & { quote: string };
      shifts: (Cite & { text: string })[];
      openQuestion: string;
    };

export type Home = {
  counts: { logs: number; themes: number; chats: number };
  themes: Theme[];
  nudge: { themeId: string; themeName: string; count: number; window: string; message: string } | null;
};

export type Analysis = { piecesRead: number; styles: Style[]; mergeSuggestion: MergeSuggestion | null };
