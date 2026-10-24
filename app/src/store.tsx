// App state in one React context. Server data (logs, themes, chats, styles, drafts) is a cache of what
// the Echo API returned; screens call src/api.ts and then put results here with the setters below.
// Only `onboarded` and `dismissedNoticeFor` are persisted on the phone (JSON via expo-file-system).
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as api from './api';
import { supabase } from './supabase';
import type { Chat, Draft, Home, LogItem, MergeSuggestion, Piece, Style, Theme } from './types';

const STATE_FILE = 'echo-state.json';

export type WriteCapture = { text: string; seconds: number };
type Local = { onboarded: boolean; dismissedNoticeFor: string | null };
type User = { name: string; email: string };

const stateFile = () => new File(Paths.document, STATE_FILE);

async function loadLocal(): Promise<Local> {
  const empty: Local = { onboarded: false, dismissedNoticeFor: null };
  const f = stateFile();
  if (!f.exists) return empty;
  try {
    return { ...empty, ...(JSON.parse(await f.text()) as Partial<Local>) };
  } catch {
    return empty;
  }
}

type Store = Local & {
  ready: boolean;
  user: User | null;
  home: Home | null;
  logs: LogItem[];
  themes: Theme[];
  chats: Chat[];
  drafts: Draft[];
  pieces: Piece[];
  styles: Style[];
  mergeSuggestion: MergeSuggestion | null;
  /** Loads everything the tabs and pickers need. Safe to call again after changes. */
  refresh: () => Promise<void>;
  /** WriteLog text kept outside the screen so Capture can append a transcript to it. */
  writeDraft: string;
  setWriteDraft: (text: string | ((prev: string) => string)) => void;
  /** Voice captures added to the WriteLog below the typed text, kept apart so each shows as its own block. */
  writeCaptures: WriteCapture[];
  addWriteCapture: (c: WriteCapture) => void;
  /** Starts a fresh WriteLog: clears typed text and captures. */
  resetWrite: () => void;
  completeOnboarding: () => void;
  /** Sign-in's Back pill: shows the onboarding screen again. */
  reopenOnboarding: () => void;
  signOut: () => Promise<void>;
  dismissNotice: (themeId: string) => void;
  addLog: (log: LogItem) => void;
  upsertChat: (chat: Chat) => void;
  /** Replaces a chat by id; `next.id` may differ (a local chat becoming a server chat). */
  replaceChat: (id: string, next: Chat) => void;
  upsertDraft: (draft: Draft) => void;
  setPieces: (pieces: Piece[] | ((prev: Piece[]) => Piece[])) => void;
  setStyles: (styles: Style[]) => void;
  setMergeSuggestion: (m: MergeSuggestion | null) => void;
};

const Ctx = createContext<Store | null>(null);

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [item, ...list];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<Local>({ onboarded: false, dismissedNoticeFor: null });
  const [localReady, setLocalReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);
  const [writeDraft, setWriteDraft] = useState('');
  const [writeCaptures, setWriteCaptures] = useState<WriteCapture[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    loadLocal().then((s) => {
      setLocal(s);
      loaded.current = true;
      setLocalReady(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    stateFile()
      .write(JSON.stringify(local))
      .catch((e) => console.warn('Could not save state', e));
  }, [local]);

  const refresh = useCallback(async () => {
    // Each list loads on its own, so one slow or failing call does not blank the rest.
    const settle = <T,>(p: Promise<T>, set: (v: T) => void) => p.then(set).catch((e) => console.warn('Load failed', e));
    await Promise.all([
      settle(api.home(), setHome),
      settle(api.logs(), setLogs),
      settle(api.themes(), setThemes),
      settle(api.chats(), (list) => setChats((prev) => [...prev.filter((c) => c.local), ...list])),
      settle(api.styles(), setStyles),
      settle(
        Promise.all([api.drafts('draft'), api.drafts('saved'), api.drafts('published')]),
        (all) => setDrafts(all.flat()),
      ),
      settle(api.pendingPieces(), setPieces),
    ]);
  }, []);

  // The Supabase session is the source of truth for "signed in".
  useEffect(() => {
    const apply = (email: string | undefined, name: string | undefined) =>
      setUser(email ? { name: name ?? email.split('@')[0], email } : null);
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      apply(u?.email, u?.user_metadata?.full_name);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.email, session?.user.user_metadata?.full_name);
      if (!session) {
        setHome(null);
        setLogs([]);
        setThemes([]);
        setChats([]);
        setDrafts([]);
        setPieces([]);
        setStyles([]);
        setMergeSuggestion(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signedInId = user?.email;
  useEffect(() => {
    if (signedInId) refresh();
  }, [signedInId, refresh]);

  const value = useMemo<Store>(
    () => ({
      ...local,
      ready: localReady && authReady,
      user,
      home,
      logs,
      themes,
      chats,
      drafts,
      pieces,
      styles,
      mergeSuggestion,
      refresh,
      writeDraft,
      setWriteDraft,
      writeCaptures,
      addWriteCapture: (c) => setWriteCaptures((prev) => [...prev, c]),
      resetWrite: () => {
        setWriteDraft('');
        setWriteCaptures([]);
      },
      completeOnboarding: () => setLocal((s) => ({ ...s, onboarded: true })),
      reopenOnboarding: () => setLocal((s) => ({ ...s, onboarded: false })),
      signOut: async () => {
        await supabase.auth.signOut();
      },
      dismissNotice: (themeId) => setLocal((s) => ({ ...s, dismissedNoticeFor: themeId })),
      addLog: (log) => {
        setLogs((prev) => upsert(prev, log));
        setHome((h) => h && { ...h, counts: { ...h.counts, logs: h.counts.logs + 1 } });
      },
      upsertChat: (chat) => setChats((prev) => upsert(prev, chat)),
      replaceChat: (id, next) => setChats((prev) => [next, ...prev.filter((c) => c.id !== id && c.id !== next.id)]),
      upsertDraft: (draft) => setDrafts((prev) => upsert(prev, draft)),
      setPieces,
      setStyles,
      setMergeSuggestion,
    }),
    [local, localReady, authReady, user, home, logs, themes, chats, drafts, pieces, styles, mergeSuggestion, refresh, writeDraft, writeCaptures],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** Id for a chat that exists only on the phone until its first question is sent. */
export const localId = () => `new-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
