// App state in one React context, persisted as JSON with expo-file-system.
// Swap the persistence for Supabase once the backend exists; screens only see the actions below.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { seed, seedWriting } from './seed';
import type { Chat, Draft, Log, Piece, Platform, State, Style, MergeSuggestion } from './types';

const STATE_FILE = 'echo-state.json';

export type WriteCapture = { text: string; seconds: number };

const empty: State = {
  onboarded: false,
  user: null,
  logs: [],
  themes: [],
  chats: [],
  drafts: [],
  pieces: [],
  styles: [],
  mergeSuggestion: null,
  dismissedNoticeFor: null,
};

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const stateFile = () => new File(Paths.document, STATE_FILE);

async function load(): Promise<State> {
  const f = stateFile();
  if (!f.exists) return empty;
  try {
    const saved = JSON.parse(await f.text()) as State;
    // Unsaved results are dropped on restart, like a discarded recording.
    // Older saves predate Write mode styles: give drafts a status and signed-in users the demo styles.
    const drafts = (saved.drafts ?? []).map((d) => ({ ...d, status: d.status ?? 'draft', version: d.version ?? 1 }));
    const writing = saved.styles ? {} : saved.user ? seedWriting() : {};
    return { ...empty, ...saved, ...writing, drafts, logs: saved.logs.filter((l) => l.saved) };
  } catch {
    return empty;
  }
}

type Store = State & {
  ready: boolean;
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
  signIn: () => void;
  signOut: () => void;
  addLog: (log: Log) => void;
  updateLog: (id: string, patch: Partial<Log>) => void;
  removeLog: (id: string) => void;
  addTheme: (name: string) => string;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, patch: Partial<Chat>) => void;
  addDraft: (draft: Draft) => void;
  updateDraft: (id: string, patch: Partial<Draft>) => void;
  dismissNotice: (themeId: string) => void;
  addPieces: (pieces: Piece[]) => void;
  removePiece: (id: string) => void;
  /** Store the result of analyzing pieces: marks every piece analyzed and replaces the styles. */
  applyAnalysis: (styles: Style[], suggestion: MergeSuggestion | null) => void;
  renameStyle: (id: string, name: string) => void;
  mergeStyles: () => void;
  undoMerge: () => void;
  keepStylesSeparate: () => void;
  publishDraft: (id: string, platform: Platform, url?: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  const [writeDraft, setWriteDraft] = useState('');
  const [writeCaptures, setWriteCaptures] = useState<WriteCapture[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    load().then((s) => {
      setState(s);
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    stateFile()
      .write(JSON.stringify(state))
      .catch((e) => console.warn('Could not save state', e));
  }, [state]);

  const patch = useCallback((fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) })), []);

  const actions = useMemo(
    () => ({
      completeOnboarding: () => patch(() => ({ onboarded: true })),
      reopenOnboarding: () => patch(() => ({ onboarded: false })),
      // Stub until Supabase Google auth exists: seeds demo history on first sign-in.
      signIn: () =>
        patch((s) => ({
          user: { name: 'You', email: 'google-account' },
          ...(s.logs.length ? {} : seed()),
          ...(s.logs.length && !s.styles.length ? seedWriting() : {}),
        })),
      signOut: () => patch(() => ({ user: null })),
      addLog: (log: Log) => patch((s) => ({ logs: [log, ...s.logs] })),
      updateLog: (id: string, p: Partial<Log>) =>
        patch((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, ...p } : l)) })),
      removeLog: (id: string) => patch((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
      addTheme: (name: string) => {
        const id = newId('th');
        patch((s) => ({ themes: [...s.themes, { id, name, createdAt: new Date().toISOString() }] }));
        return id;
      },
      addChat: (chat: Chat) => patch((s) => ({ chats: [chat, ...s.chats] })),
      updateChat: (id: string, p: Partial<Chat>) =>
        patch((s) => ({ chats: s.chats.map((c) => (c.id === id ? { ...c, ...p } : c)) })),
      addDraft: (draft: Draft) => patch((s) => ({ drafts: [draft, ...s.drafts] })),
      updateDraft: (id: string, p: Partial<Draft>) =>
        patch((s) => ({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
      dismissNotice: (themeId: string) => patch(() => ({ dismissedNoticeFor: themeId })),
      addPieces: (pieces: Piece[]) => patch((s) => ({ pieces: [...pieces, ...s.pieces] })),
      removePiece: (id: string) =>
        patch((s) => ({
          pieces: s.pieces.filter((p) => p.id !== id),
          styles: s.styles.map((st) => ({ ...st, pieceIds: st.pieceIds.filter((x) => x !== id) })),
        })),
      applyAnalysis: (styles: Style[], suggestion: MergeSuggestion | null) =>
        patch((s) => ({
          styles,
          pieces: s.pieces.map((p) => ({ ...p, analyzed: true })),
          // A suggestion the user already answered (merged or kept separate) is not re-opened.
          mergeSuggestion:
            s.mergeSuggestion && s.mergeSuggestion.status !== 'open' ? s.mergeSuggestion : (suggestion ?? s.mergeSuggestion),
        })),
      renameStyle: (id: string, name: string) =>
        patch((s) => ({ styles: s.styles.map((st) => (st.id === id ? { ...st, name } : st)) })),
      mergeStyles: () =>
        patch((s) => {
          const m = s.mergeSuggestion;
          const gone = m && s.styles.find((st) => st.id === m.mergeId);
          if (!m || m.status !== 'open' || !gone) return {};
          return {
            styles: s.styles
              .filter((st) => st.id !== m.mergeId)
              .map((st) => (st.id === m.keepId ? { ...st, pieceIds: [...st.pieceIds, ...gone.pieceIds] } : st)),
            drafts: s.drafts.map((d) => (d.styleId === m.mergeId ? { ...d, styleId: m.keepId } : d)),
            chats: s.chats.map((c) => (c.styleId === m.mergeId ? { ...c, styleId: m.keepId } : c)),
            mergeSuggestion: {
              ...m,
              status: 'merged' as const,
              removed: gone,
              moved: {
                draftIds: s.drafts.filter((d) => d.styleId === m.mergeId).map((d) => d.id),
                chatIds: s.chats.filter((c) => c.styleId === m.mergeId).map((c) => c.id),
              },
            },
          };
        }),
      undoMerge: () =>
        patch((s) => {
          const m = s.mergeSuggestion;
          if (!m || m.status !== 'merged' || !m.removed) return {};
          const back = m.removed;
          return {
            styles: [
              ...s.styles.map((st) =>
                st.id === m.keepId ? { ...st, pieceIds: st.pieceIds.filter((x) => !back.pieceIds.includes(x)) } : st,
              ),
              back,
            ],
            drafts: s.drafts.map((d) => (m.moved?.draftIds.includes(d.id) ? { ...d, styleId: back.id } : d)),
            chats: s.chats.map((c) => (m.moved?.chatIds.includes(c.id) ? { ...c, styleId: back.id } : c)),
            mergeSuggestion: { ...m, status: 'open' as const, removed: undefined, moved: undefined },
          };
        }),
      keepStylesSeparate: () =>
        patch((s) => (s.mergeSuggestion ? { mergeSuggestion: { ...s.mergeSuggestion, status: 'kept' as const } } : {})),
      publishDraft: (id: string, platform: Platform, url?: string) =>
        patch((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id ? { ...d, status: 'published' as const, platform, url, publishedAt: new Date().toISOString() } : d,
          ),
        })),
    }),
    [patch],
  );

  const value = useMemo(
    () => ({
      ...state,
      ...actions,
      ready,
      writeDraft,
      setWriteDraft,
      writeCaptures,
      addWriteCapture: (c: WriteCapture) => setWriteCaptures((prev) => [...prev, c]),
      resetWrite: () => {
        setWriteDraft('');
        setWriteCaptures([]);
      },
    }),
    [state, actions, ready, writeDraft, writeCaptures],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
