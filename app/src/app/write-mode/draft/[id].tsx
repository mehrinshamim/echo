import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { draftFrom, reviseDraft } from '@/api';
import { shortDate } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Platform as PostPlatform, Style } from '@/types';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Header } from '@/ui/Header';
import { Segmented } from '@/ui/Segmented';
import { StylePickerSheet } from '@/ui/StylePickerSheet';

const COPIED_MS = 1500;
const REVISIONS = ['Shorter', 'Stronger hook', 'More casual', 'End with a question'];
const PLATFORMS: { key: PostPlatform; label: string }[] = [
  { key: 'LinkedIn', label: 'LinkedIn' },
  { key: 'Blog', label: 'Blog' },
  { key: 'Other', label: 'Other' },
];
const CHAR_LIMIT = { LinkedIn: 3000, Blog: 3000, Story: 280 } as const;
const TEXT_MIN_HEIGHT = 250;
const PICK_LIMIT = 8;
const SQUARE = 10;
const REVISION_SLOP = { top: 2, bottom: 2 };

export default function DraftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { drafts, logs, styles, updateDraft, publishDraft } = useStore();
  const insets = useSafeAreaInsets();
  const draft = drafts.find((d) => d.id === id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState('');
  const [styleSheet, setStyleSheet] = useState(false);
  const [finish, setFinish] = useState(false);
  const [platform, setPlatform] = useState<PostPlatform>('LinkedIn');
  const [url, setUrl] = useState('');
  const [addingLog, setAddingLog] = useState(false);

  if (!draft) {
    return (
      <View style={s.root}>
        <Header mode="write" back="Write" />
        <Text style={[type.body, s.pad]}>This draft no longer exists.</Text>
      </View>
    );
  }

  const published = draft.status === 'published';
  const sources = logs.filter((l) => draft.logIds.includes(l.id));
  const style = styles.find((st) => st.id === draft.styleId);
  const limit = CHAR_LIMIT[draft.category];
  const status = published ? 'Published' : draft.status === 'saved' ? 'Saved' : 'Edited';

  const edit = (text: string) =>
    updateDraft(draft.id, { text, texts: draft.styleId ? { ...draft.texts, [draft.styleId]: text } : draft.texts });

  const copy = async () => {
    await Clipboard.setStringAsync(draft.text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  const revise = async (instruction: string) => {
    if (!instruction.trim() || busy) return;
    setBusy(true);
    try {
      const text = await reviseDraft(draft.text, instruction);
      updateDraft(draft.id, { text, version: draft.version + 1, texts: draft.styleId ? { ...draft.texts, [draft.styleId]: text } : draft.texts });
      setAsk('');
    } finally {
      setBusy(false);
    }
  };

  // Switching style keeps what you wrote in the style you leave and reuses earlier text for the one you pick.
  const pickStyle = async (next: Style | undefined) => {
    if (!next || next.id === draft.styleId || busy || published) return;
    const texts = { ...draft.texts, ...(draft.styleId ? { [draft.styleId]: draft.text } : {}) };
    if (texts[next.id] !== undefined) {
      updateDraft(draft.id, { styleId: next.id, category: next.category, text: texts[next.id], texts });
      return;
    }
    setBusy(true);
    try {
      const { text } = await draftFrom(sources, next);
      updateDraft(draft.id, { styleId: next.id, category: next.category, text, texts: { ...texts, [next.id]: text } });
    } finally {
      setBusy(false);
    }
  };

  const saveForLater = () => {
    updateDraft(draft.id, { status: 'saved', savedAt: new Date().toISOString() });
    router.dismissTo({ pathname: '/write-mode', params: { tab: 'saved', n: String(Date.now()) } });
  };

  const markPublished = () => {
    publishDraft(draft.id, platform, url.trim() || undefined);
    setFinish(false);
    router.dismissTo({ pathname: '/write-mode', params: { tab: 'pub', n: String(Date.now()) } });
  };

  const openFinish = () => {
    setPlatform(draft.category === 'Blog' ? 'Blog' : 'LinkedIn');
    setFinish(true);
  };

  const addable = logs.filter((l) => l.saved && !draft.logIds.includes(l.id)).slice(0, PICK_LIMIT);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header mode="write" back="Write" right={<Text style={s.mode}>{status}</Text>} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} style={s.bleed}>
          {styles.map((st) => (
            <Chip
              key={st.id}
              section="styles"
              label={st.name}
              plain={st.id !== draft.styleId}
              onPress={published ? undefined : () => pickStyle(st)}
            />
          ))}
          {!published && <Chip section="styles" label="Style" dashed onPress={() => setStyleSheet(true)} />}
        </ScrollView>

        <TextInput
          style={type.h1}
          value={draft.title}
          onChangeText={(title) => updateDraft(draft.id, { title })}
          editable={!published}
          multiline
        />
        <Card style={s.textCard}>
          <TextInput
            style={[type.body, s.text]}
            value={draft.text}
            onChangeText={edit}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            editable={!busy && !published}
          />
          <View style={s.counter}>
            <Text style={type.meta}>
              {draft.text.length.toLocaleString()} / {limit.toLocaleString()} characters
            </Text>
            <Button label={copied ? 'Copied' : 'Copy'} variant="secondary" icon={copied ? 'check' : 'copy'} onPress={copy} style={s.small} />
          </View>
        </Card>

        {!published && (
          <View style={s.wrap}>
            {REVISIONS.map((r) => (
              <Pressable key={r} accessibilityRole="button" hitSlop={REVISION_SLOP} onPress={() => revise(r)} style={s.revision}>
                <Text style={type.label}>{r}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={type.meta}>
          Built from{style ? ` · written like ${style.name}` : ''} · v{draft.version} · {shortDate(draft.createdAt)}
        </Text>
        {sources.map((l) => (
          <Pressable key={l.id} accessibilityRole="button" onPress={() => router.push(`/log/${l.id}`)} style={s.source}>
            <View style={s.square} />
            <Text style={[type.bodyStrong, s.grow]} numberOfLines={1}>
              {l.title}
            </Text>
            <Text style={type.meta}>{shortDate(l.createdAt)}</Text>
          </Pressable>
        ))}
        {!published && <Chip section="logs" label="Log" dashed onPress={() => setAddingLog(!addingLog)} />}
        {addingLog && (
          <Card style={s.gap}>
            {addable.length ? (
              addable.map((l) => (
                <Pressable
                  key={l.id}
                  style={s.pickRow}
                  onPress={() => {
                    updateDraft(draft.id, { logIds: [...draft.logIds, l.id] });
                    setAddingLog(false);
                  }}
                >
                  <Text style={type.bodyStrong} numberOfLines={1}>
                    {l.title}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={type.meta}>Nothing left to add.</Text>
            )}
          </Card>
        )}
        {published && (
          <Text style={type.meta}>
            Published{draft.platform ? ` on ${draft.platform}` : ''}
            {draft.publishedAt ? ` · ${shortDate(draft.publishedAt)}` : ''}
          </Text>
        )}
      </ScrollView>

      {!published && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
          <TextInput
            style={[type.body, s.ask]}
            value={ask}
            onChangeText={setAsk}
            onSubmitEditing={() => revise(ask)}
            returnKeyType="send"
            placeholder={busy ? 'Working…' : 'Ask for changes'}
            placeholderTextColor={colors.placeholder}
          />
          <View style={s.row}>
            <Button label="Save for later" variant="secondary" onPress={saveForLater} style={s.grow} />
            <Button label="Finish" onPress={openFinish} style={s.grow} />
          </View>
        </View>
      )}

      <StylePickerSheet
        visible={styleSheet}
        styles={styles}
        selectedId={draft.styleId}
        onSelect={(sid) => pickStyle(styles.find((st) => st.id === sid) ?? closest(styles, draft.category))}
        onClose={() => setStyleSheet(false)}
      />

      <BottomSheet visible={finish} title="Finish this post" onClose={() => setFinish(false)}>
        <Button label={copied ? 'Copied text' : 'Copy text'} variant="secondary" icon="copy" onPress={copy} />
        <Text style={type.meta}>Where did you post it?</Text>
        <Segmented options={PLATFORMS} value={platform} onChange={setPlatform} />
        <TextInput
          style={[type.body, s.url]}
          value={url}
          onChangeText={setUrl}
          placeholder="Paste the link (optional)"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={type.meta}>Published posts are added to your styles, so the next one sounds even more like you.</Text>
        <Button label="Mark as published" onPress={markPublished} />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

/** "Let Echo choose" from the sheet: stay in the draft's current category if a style matches it. */
const closest = (styles: Style[], category: string) => styles.find((st) => st.category === category) ?? styles[0];

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: layout.gutter, paddingTop: space.l },
  mode: { ...type.label, color: colors.onInk },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, paddingBottom: space.xxl, gap: layout.cardGap },
  bleed: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: layout.gutter },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  grow: { flex: 1 },
  gap: { gap: space.xs },
  textCard: { padding: space.xs },
  text: { padding: space.m, minHeight: TEXT_MIN_HEIGHT, textAlignVertical: 'top' },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  small: { height: size.tap, paddingHorizontal: space.m },
  revision: {
    height: size.chip + 2,
    paddingHorizontal: space.m,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: size.tap,
    paddingHorizontal: space.m,
    borderRadius: radius.tile,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  square: { width: SQUARE, height: SQUARE, borderRadius: SQUARE / 3, backgroundColor: colors.logs.fill, borderWidth: border.width, borderColor: border.color },
  pickRow: { minHeight: size.tap, justifyContent: 'center' },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    gap: space.s,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  ask: {
    height: size.btnSecondary,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  url: {
    height: size.btnSecondary,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
});
