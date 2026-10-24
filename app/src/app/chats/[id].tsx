import { useRef, useState } from 'react';
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
import { ask } from '@/api';
import { shortDate } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { CitationPill } from '@/ui/CitationPill';
import { Header } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { StylePickerSheet } from '@/ui/StylePickerSheet';

const SUGGESTIONS = ['What did I learn at hackathons?', 'How has my confidence changed?', 'What keeps coming up lately?'];
const PICK_LIMIT = 8;

/** A chat answers only from your logs. + Theme / + Log narrow the context it reads. */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chats, logs, themes, styles, updateChat } = useStore();
  const insets = useSafeAreaInsets();
  const chat = chats.find((c) => c.id === id);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'theme' | 'log' | null>(null);
  const [styleSheet, setStyleSheet] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  if (!chat) {
    return (
      <View style={s.root}>
        <Header />
        <Text style={[type.body, s.pad]}>This chat no longer exists.</Text>
      </View>
    );
  }

  const saved = logs.filter((l) => l.saved);
  const scoped = () => {
    if (!chat.themeIds.length && !chat.logIds.length) return saved;
    return saved.filter((l) => chat.logIds.includes(l.id) || l.themeIds.some((t) => chat.themeIds.includes(t)));
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setQ('');
    setBusy(true);
    const withQ = [...chat.messages, { role: 'user' as const, text: question }];
    updateChat(chat.id, { messages: withQ, title: chat.messages.length ? chat.title : question });
    const { answer, citations } = await ask(question, scoped());
    updateChat(chat.id, { messages: [...withQ, { role: 'assistant', text: answer, citations }] });
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const pickOptions =
    picker === 'theme'
      ? themes.filter((t) => !chat.themeIds.includes(t.id)).map((t) => ({ id: t.id, label: t.name }))
      : picker === 'log'
        ? saved.filter((l) => !chat.logIds.includes(l.id)).slice(0, PICK_LIMIT).map((l) => ({ id: l.id, label: l.title }))
        : [];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header back="Chats" />
      <View style={s.context}>
        <Text style={type.meta}>
          {chat.themeIds.length || chat.logIds.length ? 'Answering from' : 'Answering from all your logs'}
        </Text>
        <View style={s.chips}>
          {chat.themeIds.map((tid) => (
            <Chip
              key={tid}
              section="themes"
              label={themes.find((t) => t.id === tid)?.name ?? 'Theme'}
              onRemove={() => updateChat(chat.id, { themeIds: chat.themeIds.filter((x) => x !== tid) })}
            />
          ))}
          {chat.logIds.map((lid) => (
            <Chip
              key={lid}
              section="logs"
              label={logs.find((l) => l.id === lid)?.title ?? 'Log'}
              onRemove={() => updateChat(chat.id, { logIds: chat.logIds.filter((x) => x !== lid) })}
            />
          ))}
          {chat.styleId && (
            <Chip
              section="styles"
              label={styles.find((st) => st.id === chat.styleId)?.name ?? 'Style'}
              onRemove={() => updateChat(chat.id, { styleId: undefined })}
            />
          )}
          <Chip section="chats" label="Theme" add onPress={() => setPicker(picker === 'theme' ? null : 'theme')} />
          <Chip section="chats" label="Log" add onPress={() => setPicker(picker === 'log' ? null : 'log')} />
          <Chip section="chats" label="Style" add onPress={() => setStyleSheet(true)} />
        </View>
        {picker && (
          <Card style={s.picker}>
            {pickOptions.length ? (
              pickOptions.map((o) => (
                <Pressable
                  key={o.id}
                  style={s.pickRow}
                  onPress={() => {
                    updateChat(
                      chat.id,
                      picker === 'theme' ? { themeIds: [...chat.themeIds, o.id] } : { logIds: [...chat.logIds, o.id] },
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
        )}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled">
        {!chat.messages.length &&
          SUGGESTIONS.map((sug) => (
            <Pressable key={sug} onPress={() => send(sug)} style={s.suggestion}>
              <Text style={type.bodyStrong}>↳ {sug}</Text>
            </Pressable>
          ))}
        {chat.messages.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={s.user}>
              <Text style={type.bodyStrong}>{m.text}</Text>
            </View>
          ) : (
            <Card key={i} fill={colors.chats.fill} style={s.answer}>
              <Text style={type.body}>{m.text}</Text>
              {!!m.citations?.length && (
                <View style={s.sources}>
                  {m.citations.map((c) => (
                    <Pressable key={c.n} style={s.source} onPress={() => router.push(`/log/${c.logId}`)}>
                      <CitationPill n={c.n} onPress={() => router.push(`/log/${c.logId}`)} />
                      <Text style={[type.meta, s.flex]} numberOfLines={1}>
                        {c.title} · {shortDate(c.date)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>
          ),
        )}
        {busy && <Text style={type.meta}>Searching your logs…</Text>}
      </ScrollView>

      <View style={[s.inputBar, { paddingBottom: insets.bottom + space.m }]}>
        <TextInput
          style={[type.body, s.input]}
          value={q}
          onChangeText={setQ}
          placeholder="Ask about your logs"
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={() => send(q)}
          returnKeyType="send"
        />
        <IconButton icon="arrow-up" label="Send" onPress={() => send(q)} />
      </View>
      <StylePickerSheet
        visible={styleSheet}
        styles={styles}
        selectedId={chat.styleId}
        onSelect={(styleId) => updateChat(chat.id, { styleId })}
        onClose={() => setStyleSheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: layout.gutter },
  context: { paddingHorizontal: layout.gutter, gap: space.s, paddingBottom: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  picker: { paddingVertical: space.xs },
  pickRow: { minHeight: size.tap, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider },
  messages: { paddingHorizontal: layout.gutter, gap: layout.cardGap, paddingBottom: space.l },
  suggestion: { minHeight: size.tap, justifyContent: 'center' },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    padding: space.m,
    borderRadius: radius.tile,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  answer: { gap: space.m },
  sources: { gap: space.s },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: size.tap },
  flex: { flex: 1 },
  inputBar: {
    flexDirection: 'row',
    gap: space.s,
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: space.s,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    height: size.btnSecondary,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
});
