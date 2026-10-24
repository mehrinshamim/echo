import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { draftFrom } from '@/api';
import { newId, useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Style } from '@/types';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Header } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { StylePickerSheet } from '@/ui/StylePickerSheet';

const IDEAS = [
  'A LinkedIn post about the Wikimedia hackathon',
  'What changed in how I think about imposter syndrome',
  'A thread on the mentor table',
];
const PICK_LIMIT = 8;

/** When no style is picked ("Let Echo choose"), match the ask to the closest style. */
function closestStyle(prompt: string, styles: Style[]): Style | undefined {
  const p = prompt.toLowerCase();
  const wanted = /thread|story/.test(p) ? 'Story' : /blog|article|post on my blog/.test(p) ? 'Blog' : 'LinkedIn';
  return styles.find((st) => st.category === wanted) ?? styles[0];
}

/** New post: say what to write (logs, themes) and how (a style), then Echo drafts it. */
export default function PostChat() {
  const params = useLocalSearchParams<{ styleId?: string }>();
  const { logs, themes, styles, addDraft } = useStore();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [styleId, setStyleId] = useState<string | undefined>(params.styleId);
  const [themeIds, setThemeIds] = useState<string[]>([]);
  const [logIds, setLogIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'theme' | 'log' | null>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const saved = logs.filter((l) => l.saved);
  const style = styles.find((st) => st.id === styleId);
  const options =
    picker === 'theme'
      ? themes.filter((t) => !themeIds.includes(t.id)).map((t) => ({ id: t.id, label: t.name }))
      : picker === 'log'
        ? saved.filter((l) => !logIds.includes(l.id)).slice(0, PICK_LIMIT).map((l) => ({ id: l.id, label: l.title }))
        : [];

  const write = async (text: string) => {
    const ask = text.trim();
    if (!ask || busy) return;
    setBusy(true);
    try {
      const chosen = style ?? closestStyle(ask, styles);
      const picked = saved.filter((l) => logIds.includes(l.id) || l.themeIds.some((t) => themeIds.includes(t)));
      const source = picked.length ? picked : saved.slice(0, 3);
      const { title, text: body } = await draftFrom(source, chosen);
      const id = newId('dr');
      addDraft({
        id,
        createdAt: new Date().toISOString(),
        category: chosen?.category ?? 'LinkedIn',
        title,
        text: body,
        logIds: source.map((l) => l.id),
        status: 'draft',
        version: 1,
        styleId: chosen?.id,
        texts: chosen ? { [chosen.id]: body } : undefined,
      });
      router.replace(`/write-mode/draft/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header mode="write" back="Write" right={<Text style={s.mode}>New post</Text>} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={type.h1}>What do you want to post?</Text>
        <Text style={type.body}>Add logs or themes for what to say, and a style for how to say it.</Text>
        <Text style={[type.meta, s.top]}>From this week</Text>
        {IDEAS.map((idea) => (
          <Pressable key={idea} accessibilityRole="button" onPress={() => setPrompt(idea)} style={s.idea}>
            <Text style={type.button}>↳</Text>
            <Text style={[type.bodyStrong, s.grow]}>{idea}</Text>
          </Pressable>
        ))}
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
          <Chip section="styles" label="Style" dashed onPress={() => setSheet(true)} />
          <Chip section="logs" label="Log" dashed onPress={() => setPicker(picker === 'log' ? null : 'log')} />
          <Chip section="themes" label="Theme" dashed onPress={() => setPicker(picker === 'theme' ? null : 'theme')} />
          <View style={s.grow} />
          <IconButton icon="arrow-up" label="Write it" onPress={() => write(prompt)} />
        </View>
      </View>

      <StylePickerSheet visible={sheet} styles={styles} selectedId={styleId} onSelect={setStyleId} onClose={() => setSheet(false)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mode: { ...type.label, color: colors.onInk },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, gap: layout.cardGap },
  top: { marginTop: space.s },
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
    borderRadius: radius.card,
    borderWidth: border.width,
    borderColor: border.color,
    padding: space.m,
    gap: space.m,
  },
  input: { padding: 0, minHeight: size.tap },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s },
});
