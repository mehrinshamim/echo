import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { errorText } from '@/client';
import { useStore } from '@/store';
import { border, colors, layout, size, space, type } from '@/theme';
import type { DraftCategory } from '@/types';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Header } from '@/ui/Header';
import { SendButton } from '@/ui/SendButton';
import { StylePickerSheet } from '@/ui/StylePickerSheet';

const IDEAS = [
  'A LinkedIn post about the Wikimedia hackathon',
  'What changed in how I think about imposter syndrome',
  'A thread on the mentor table',
];
const PICK_LIMIT = 8;

function inferCategory(prompt: string): DraftCategory {
  const p = prompt.toLowerCase();
  if (/thread|story/.test(p)) return 'Story';
  if (/blog|article|post on my blog/.test(p)) return 'Blog';
  return 'LinkedIn';
}

/** New post: say what to write (logs, themes) and how (a style), then Echo drafts it. */
export default function PostChat() {
  const params = useLocalSearchParams<{ styleId?: string; logId?: string; logIds?: string }>();
  const { logs, themes, styles, upsertDraft } = useStore();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [styleId, setStyleId] = useState<string | undefined>(params.styleId);
  const [themeIds, setThemeIds] = useState<string[]>([]);
  // Opened from a log or an answer: start with those logs as the "what to say".
  const [logIds, setLogIds] = useState<string[]>(() => (params.logIds ?? params.logId ?? '').split(',').filter(Boolean));
  const [picker, setPicker] = useState<'theme' | 'log' | null>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const style = styles.find((st) => st.id === styleId);
  const options =
    picker === 'theme'
      ? themes.filter((t) => !themeIds.includes(t.id)).map((t) => ({ id: t.id, label: t.name }))
      : picker === 'log'
        ? logs.filter((l) => !logIds.includes(l.id)).slice(0, PICK_LIMIT).map((l) => ({ id: l.id, label: l.title }))
        : [];

  const write = async (text: string) => {
    const ask = text.trim();
    if (!ask || busy) return;
    setBusy(true);
    setError('');
    try {
      const category = inferCategory(ask);
      const draft = await api.createDraft({
        prompt: ask,
        styleId: style?.id,
        logIds,
        themeIds,
        category,
      });
      upsertDraft(draft);
      router.replace(`/write-mode/draft/${draft.id}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header mode="write" back="Write" right={<Text style={s.mode}>New post</Text>} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={type.h1}>What do you want to post?</Text>
        <Text style={[type.body, s.secondary]}>Add logs or themes for what to say, and a style for how to say it.</Text>
        <View style={s.grow} />
        <Text style={[type.label, s.secondary]}>From this week</Text>
        {IDEAS.map((idea) => (
          <Pressable key={idea} accessibilityRole="button" onPress={() => setPrompt(idea)} style={s.idea}>
            <Text style={s.arrow}>↳</Text>
            <Text style={[type.bodyStrong, s.grow]}>{idea}</Text>
          </Pressable>
        ))}
        {!!error && <Text style={[type.meta, { color: colors.recording }]}>{error}</Text>}
      </ScrollView>

      {picker && (
        <Card style={s.picker}>
          {options.length ? (
            options.map((o) => (
              <Pressable
                key={o.id}
                style={s.pickRow}
                onPress={() => {
                  if (picker === 'theme') setThemeIds([...themeIds, o.id]);
                  else setLogIds([...logIds, o.id]);
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

      <View style={[s.composer, { marginBottom: insets.bottom + space.m }]}>
        <TextInput
          style={[type.body, s.input]}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="A LinkedIn post about the hackathon"
          placeholderTextColor={colors.placeholder}
          multiline
        />
        <View style={s.chips}>
          {style && <Chip section="styles" label={style.name} onRemove={() => setStyleId(undefined)} />}
          {themeIds.map((tid) => (
            <Chip
              key={tid}
              section="themes"
              label={themes.find((t) => t.id === tid)?.name ?? 'Theme'}
              onRemove={() => setThemeIds(themeIds.filter((x) => x !== tid))}
            />
          ))}
          {logIds.map((lid) => (
            <Chip
              key={lid}
              section="logs"
              label={logs.find((l) => l.id === lid)?.title ?? 'Log'}
              onRemove={() => setLogIds(logIds.filter((x) => x !== lid))}
            />
          ))}
          <Chip section="styles" label="Style" add onPress={() => setSheet(true)} />
          <Chip section="logs" label="Log" add onPress={() => setPicker(picker === 'log' ? null : 'log')} />
          <Chip section="themes" label="Theme" add onPress={() => setPicker(picker === 'theme' ? null : 'theme')} />
          <View style={s.grow} />
          <SendButton label="Write it" onPress={() => write(prompt)} disabled={busy || !prompt.trim()} />
        </View>
      </View>

      <StylePickerSheet visible={sheet} styles={styles} selectedId={styleId} onSelect={setStyleId} onClose={() => setSheet(false)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mode: { ...type.label, color: colors.onInk },
  content: { flexGrow: 1, paddingHorizontal: layout.gutter, paddingTop: space.l, gap: space.s + 2 },
  secondary: { color: colors.textSecondary },
  arrow: { fontFamily: 'Archivo_700Bold', fontSize: 18, color: colors.styles.line },
  grow: { flex: 1 },
  idea: {
    flexDirection: 'row',
    gap: space.m,
    alignItems: 'center',
    minHeight: size.tap + space.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  picker: { marginHorizontal: layout.gutter, marginBottom: space.s, gap: space.xs },
  pickRow: { minHeight: size.tap, justifyContent: 'center' },
  composer: {
    marginHorizontal: layout.gutter,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: border.width,
    borderColor: border.color,
    paddingTop: space.m + 2,
    paddingLeft: space.m + 2,
    paddingRight: space.s + 2,
    paddingBottom: space.s + 2,
    gap: space.m,
  },
  input: { padding: 0, minHeight: size.tap },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s },
});
