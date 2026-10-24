import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Feather from '@expo/vector-icons/Feather';
import * as api from '@/api';
import { errorText } from '@/client';
import { shortDate } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Citation, Message } from '@/types';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { CitationPill } from '@/ui/CitationPill';
import { SendButton } from '@/ui/SendButton';
import { StylePickerSheet } from '@/ui/StylePickerSheet';

const SUGGESTIONS = [
  'What did I learn at hackathons this month?',
  'What do I keep saying about open source?',
  'Prepare me for my next event',
];
const PICK_LIMIT = 8;
const SWATCH = 14;
const USER_RADII = { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 6 };

/** Renders an answer with its [n] markers as inline citation pills. */
function AnswerText({ text, citations, onOpen }: { text: string; citations?: Citation[]; onOpen: (logId: string) => void }) {
  const parts = text.split(/\[(\d+)\]/);
  return (
    <Text style={[type.bodyLg, s.answerText]}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const c = citations?.find((x) => x.n === Number(part));
        return c ? (
          <Text key={i}> <CitationPill n={c.n} onPress={() => onOpen(c.logId)} /></Text>
        ) : (
          `[${part}]`
        );
      })}
    </Text>
  );
}

/** A chat answers only from your logs. + Theme / + Log narrow the context it reads. */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chats, logs, themes, styles, upsertChat, replaceChat } = useStore();
  const insets = useSafeAreaInsets();
  const chat = chats.find((c) => c.id === id);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [picker, setPicker] = useState<'theme' | 'log' | null>(null);
  const [styleSheet, setStyleSheet] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  // Load full chat history from server if it has no messages but isn't local.
  useEffect(() => {
    if (!chat || chat.local || chat.messages.length > 0) return;
    api.getChat(id).then((full) => upsertChat(full)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!chat) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.s }]}>
        <View style={s.padded}>
          <BackPill label="Chats" />
        </View>
        <Text style={[type.body, s.padded]}>This chat no longer exists.</Text>
      </View>
    );
  }

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setQ('');
    setSendErr('');
    setBusy(true);
    const userMsg: Message = { role: 'user', text: question };
    // Optimistically show the user bubble.
    upsertChat({ ...chat, messages: [...chat.messages, userMsg] });
    try {
      if (chat.local) {
        // First question: create the chat on the server.
        const answer = await api.createChat(question, chat.themeIds, chat.logIds);
        const serverChat = {
          id: answer.chatId,
          title: question.slice(0, 60),
          themeIds: chat.themeIds,
          logIds: chat.logIds,
          updatedAt: new Date().toISOString(),
          local: false as const,
          messages: [userMsg, { role: 'assistant' as const, text: answer.text, citations: answer.citations }],
        };
        replaceChat(chat.id, serverChat);
      } else {
        const answer = await api.askFollowUp(chat.id, question);
        upsertChat({
          ...chat,
          messages: [...chat.messages, userMsg, { role: 'assistant', text: answer.text, citations: answer.citations }],
          updatedAt: new Date().toISOString(),
        });
      }
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setSendErr(errorText(e));
      // Roll back the optimistic user bubble.
      upsertChat({ ...chat });
    } finally {
      setBusy(false);
    }
  };

  const pickOptions =
    picker === 'theme'
      ? themes.filter((t) => !chat.themeIds.includes(t.id)).map((t) => ({ id: t.id, label: t.name }))
      : picker === 'log'
        ? logs.filter((l) => !chat.logIds.includes(l.id)).slice(0, PICK_LIMIT).map((l) => ({ id: l.id, label: l.title }))
        : [];

  const contextChips = (
    <>
      {chat.themeIds.map((tid) => (
        <Chip
          key={tid}
          section="themes"
          label={themes.find((t) => t.id === tid)?.name ?? 'Theme'}
          onRemove={() => upsertChat({ ...chat, themeIds: chat.themeIds.filter((x) => x !== tid) })}
        />
      ))}
      {chat.logIds.map((lid) => (
        <Chip
          key={lid}
          section="logs"
          label={logs.find((l) => l.id === lid)?.title ?? 'Log'}
          onRemove={() => upsertChat({ ...chat, logIds: chat.logIds.filter((x) => x !== lid) })}
        />
      ))}
      {chat.styleId && (
        <Chip
          section="styles"
          label={styles.find((st) => st.id === chat.styleId)?.name ?? 'Style'}
          onRemove={() => upsertChat({ ...chat, styleId: undefined })}
        />
      )}
      <Chip section="chats" label="Theme" add onPress={() => setPicker(picker === 'theme' ? null : 'theme')} />
      <Chip section="chats" label="Log" add onPress={() => setPicker(picker === 'log' ? null : 'log')} />
      <Chip section="chats" label="Style" add onPress={() => setStyleSheet(true)} />
    </>
  );

  const pickerCard = picker && (
    <Card style={s.picker}>
      {pickOptions.length ? (
        pickOptions.map((o) => (
          <Pressable
            key={o.id}
            style={s.pickRow}
            onPress={() => {
              upsertChat(
                picker === 'theme'
                  ? { ...chat, themeIds: [...chat.themeIds, o.id] }
                  : { ...chat, logIds: [...chat.logIds, o.id] },
              );
              setPicker(null);
            }}
          >
            <Text style={type.bodyStrong} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={type.meta}>Nothing left to add.</Text>
      )}
    </Card>
  );

  const sheet = (
    <StylePickerSheet
      visible={styleSheet}
      styles={styles}
      selectedId={chat.styleId}
      onSelect={(styleId) => upsertChat({ ...chat, styleId })}
      onClose={() => setStyleSheet(false)}
    />
  );

  // New chat: intro, suggestions and a composer card.
  if (!chat.messages.length) {
    return (
      <KeyboardAvoidingView
        style={[s.root, { paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.s }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[s.padded, s.topRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.close}>
            <Feather name="x" size={18} color={colors.ink} />
          </Pressable>
          <View style={s.titleRow}>
            <View style={s.swatch} />
            <Text style={type.h2}>New chat</Text>
          </View>
          <View style={s.close} />
        </View>
        <View style={[s.padded, s.intro]}>
          <Text style={type.h1}>Ask your logs</Text>
          <Text style={[type.body, s.secondary]}>
            Answers only use what you've said, and every line links back to the log it came from.
          </Text>
        </View>
        <View style={s.spacer} />
        <View style={s.padded}>
          {SUGGESTIONS.map((sug) => (
            <Pressable key={sug} accessibilityRole="button" onPress={() => send(sug)} style={s.suggestion}>
              <Text style={s.arrow}>↳</Text>
              <Text style={[type.bodyStrong, s.flex]}>{sug}</Text>
            </Pressable>
          ))}
        </View>
        {pickerCard && <View style={s.padded}>{pickerCard}</View>}
        {!!sendErr && <Text style={[type.meta, s.padded, { color: colors.recording }]}>{sendErr}</Text>}
        <View style={[s.composer, s.padded2]}>
          <TextInput
            style={[type.bodyLg, s.composerInput]}
            value={q}
            onChangeText={setQ}
            placeholder="Ask anything"
            placeholderTextColor={colors.placeholder}
            onSubmitEditing={() => send(q)}
            returnKeyType="send"
          />
          <View style={s.chips}>
            {contextChips}
            <View style={s.flex} />
            <SendButton onPress={() => send(q)} disabled={busy || !q.trim()} />
          </View>
        </View>
        {sheet}
      </KeyboardAvoidingView>
    );
  }

  // Conversation: user bubbles, unboxed answers with inline citations, sources and actions.
  const firstTheme = themes.find((t) => t.id === chat.themeIds[0]);
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[s.messages, { paddingTop: insets.top + space.s }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topRow}>
          <BackPill label="Chats" />
          {firstTheme && (
            <View style={s.tag}>
              <Text style={[type.label, s.tagText]}>{firstTheme.name}</Text>
            </View>
          )}
        </View>
        <View style={s.contextRow}>{contextChips}</View>
        {pickerCard}
        {!!sendErr && <Text style={[type.meta, { color: colors.recording }]}>{sendErr}</Text>}
        {chat.messages.map((m: Message, i) =>
          m.role === 'user' ? (
            <View key={i} style={s.user}>
              <Text style={type.bodyStrong}>{m.text}</Text>
            </View>
          ) : (
            <View key={i} style={s.reply}>
              <AnswerText text={m.text} citations={m.citations} onOpen={(lid) => router.push(`/log/${lid}`)} />
              {!!m.citations?.length && (
                <View style={s.sources}>
                  <Text style={[type.label, s.secondary]}>From your logs</Text>
                  {m.citations.map((c) => (
                    <Pressable key={c.n} accessibilityRole="button" style={s.source} onPress={() => router.push(`/log/${c.logId}`)}>
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{c.n}</Text>
                      </View>
                      <Text style={[type.bodyStrong, s.flex]} numberOfLines={1}>
                        {c.title}
                      </Text>
                      <Text style={type.meta}>{shortDate(c.date)}</Text>
                    </Pressable>
                  ))}
                  <View style={s.actions}>
                    <Button label="Copy" variant="secondary" onPress={() => Clipboard.setStringAsync(m.text)} style={s.actionBtn} />
                    <Button
                      label="Make a post"
                      onPress={() =>
                        router.push({
                          pathname: '/write-mode/chat',
                          params: { logIds: m.citations!.map((c) => c.logId).join(',') },
                        })
                      }
                      style={s.actionBtn}
                    />
                  </View>
                </View>
              )}
            </View>
          ),
        )}
        {busy && <Text style={type.meta}>Searching your logs…</Text>}
      </ScrollView>
      <View style={[s.followUp, { paddingBottom: insets.bottom + space.m }]}>
        <TextInput
          style={[type.body, s.followInput]}
          value={q}
          onChangeText={setQ}
          placeholder="Ask a follow-up"
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={() => send(q)}
          returnKeyType="send"
        />
        {!!q.trim() && <SendButton onPress={() => send(q)} disabled={busy} />}
      </View>
      {sheet}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: layout.gutter },
  padded2: { marginHorizontal: layout.gutter },
  flex: { flex: 1 },
  spacer: { flex: 1 },
  secondary: { color: colors.textSecondary },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.tap },
  close: {
    width: size.tap,
    height: size.tap,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 4,
    backgroundColor: colors.chats.fill,
    borderWidth: border.width,
    borderColor: border.color,
  },
  intro: { gap: space.m - 2, marginTop: space.l + 2 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m + 2,
    minHeight: 52,
    paddingVertical: space.s,
    paddingHorizontal: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  arrow: { fontFamily: 'Archivo_700Bold', fontSize: 18, color: colors.chats.line },
  picker: { paddingVertical: space.xs, marginBottom: space.s },
  pickRow: { minHeight: size.tap, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider },
  composer: {
    marginTop: space.s,
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: 22,
    paddingTop: space.m + 2,
    paddingLeft: space.l,
    paddingRight: space.s + 2,
    paddingBottom: space.s + 2,
    gap: space.m,
  },
  composerInput: { padding: 0, minHeight: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  messages: { paddingHorizontal: layout.gutter, paddingBottom: space.xl, gap: space.l },
  tag: {
    height: 32,
    paddingHorizontal: space.m,
    borderRadius: 16,
    backgroundColor: colors.themes.fill,
    borderWidth: border.width,
    borderColor: border.color,
    justifyContent: 'center',
  },
  tagText: { fontSize: 13 },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: colors.chats.fill,
    borderWidth: border.width,
    borderColor: border.color,
    ...USER_RADII,
    paddingVertical: space.m,
    paddingHorizontal: space.l,
  },
  reply: { gap: space.l },
  answerText: { lineHeight: 28 },
  sources: { gap: space.s },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: size.tap,
    padding: space.m,
    borderRadius: radius.small,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  badge: {
    width: size.citation,
    height: size.citation,
    borderRadius: size.citation / 2,
    backgroundColor: colors.logs.fill,
    borderWidth: border.width,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Archivo_700Bold', fontSize: 12 },
  actions: { flexDirection: 'row', gap: space.s },
  actionBtn: { height: size.tap, paddingHorizontal: space.l },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: layout.gutter - 4,
    paddingTop: space.s,
  },
  followInput: {
    flex: 1,
    height: size.btnMd,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
});
