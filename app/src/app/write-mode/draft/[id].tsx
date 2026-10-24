import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { errorText } from '@/client';
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
const SQUARE = 10;
const AUTOSAVE_DEBOUNCE_MS = 2000;

export default function DraftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { drafts, logs, styles, upsertDraft } = useStore();
  const insets = useSafeAreaInsets();
  const draft = drafts.find((d) => d.id === id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState('');
  const [styleSheet, setStyleSheet] = useState(false);
  const [finish, setFinish] = useState(false);
  const [platform, setPlatform] = useState<PostPlatform>('LinkedIn');
  const [url, setUrl] = useState('');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id || draft) return;
    api
      .getDraft(id)
      .then(upsertDraft)
      .catch((e) => setError(errorText(e)));
  }, [id, draft, upsertDraft]);

  if (!draft) {
    return (
      <View style={s.root}>
        <Header mode="write" back="Write" />
        <Text style={[type.body, s.pad]}>{error || 'This draft no longer exists.'}</Text>
      </View>
    );
  }

  const published = draft.status === 'published';
  const sources = draft.sourceLogs ?? logs.filter((l) => draft.logIds.includes(l.id));
  const style = styles.find((st) => st.id === draft.styleId);
  const limit = CHAR_LIMIT[draft.category];
  const status = published ? 'Published' : draft.status === 'saved' ? 'Saved' : 'Edited';

  const edit = (text: string) => {
    upsertDraft({ ...draft, text });
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      api
        .editDraft(draft.id, text)
        .then(upsertDraft)
        .catch((e) => console.warn('Autosave failed', e));
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const copy = async () => {
    await Clipboard.setStringAsync(draft.text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  const revise = async (instruction: string) => {
    if (!instruction.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.reviseDraft(draft.id, instruction);
      upsertDraft(updated);
      setAsk('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const pickStyle = async (next: Style | undefined) => {
    if (!next || next.id === draft.styleId || busy || published) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.restyleDraft(draft.id, next.id);
      upsertDraft(updated);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const saveForLater = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.saveDraft(draft.id);
      upsertDraft(updated);
      router.dismissTo({ pathname: '/write-mode', params: { tab: 'saved', n: String(Date.now()) } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const markPublished = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.publishDraft(draft.id, platform, url.trim() || undefined);
      upsertDraft(updated);
      setFinish(false);
      router.dismissTo({ pathname: '/write-mode', params: { tab: 'pub', n: String(Date.now()) } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const openFinish = () => {
    setPlatform(draft.category === 'Blog' ? 'Blog' : 'LinkedIn');
    setFinish(true);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header mode="write" back="Write" label={`${status} · v${draft.version}`} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} style={s.bleed}>
          {styles.map((st) => (
            <Chip
              key={st.id}
              section="styles"
              label={st.name}
              large
              plain={st.id !== draft.styleId}
              onPress={published ? undefined : () => pickStyle(st)}
            />
          ))}
          {!published && <Chip section="styles" label="Style" large dashed onPress={() => setStyleSheet(true)} />}
        </ScrollView>

        {!!error && <Text style={[type.meta, { color: colors.recording }]}>{error}</Text>}

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
            <Button label={copied ? 'Copied' : 'Copy'} variant="secondary" size="xs" onPress={copy} style={s.small} />
          </View>
        </Card>

        {!published && (
          <View style={s.wrap}>
            {REVISIONS.map((r) => (
              <Chip key={r} large plain section="styles" label={r} onPress={() => revise(r)} />
            ))}
          </View>
        )}

        <Text style={[type.label, s.secondary]}>Built from</Text>
        {sources.map((l) => (
          <Pressable key={l.id} accessibilityRole="button" onPress={() => router.push(`/log/${l.id}`)} style={s.source}>
            <View style={s.square} />
            <Text style={[type.bodyStrong, s.sourceTitle]} numberOfLines={1}>
              {l.title}
            </Text>
            <Text style={type.meta}>{shortDate(l.createdAt)}</Text>
          </Pressable>
        ))}

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
            <Button label="Save for later" variant="secondary" size="footer" onPress={saveForLater} style={s.grow} />
            <Button label="Finish" size="footer" onPress={openFinish} style={s.grow} />
          </View>
        </View>
      )}

      <StylePickerSheet
        visible={styleSheet}
        styles={styles}
        selectedId={draft.styleId}
        onSelect={(sid) => pickStyle(styles.find((st) => st.id === sid))}
        onClose={() => setStyleSheet(false)}
      />

      <BottomSheet visible={finish} title="Finish this post" onClose={() => setFinish(false)}>
        <Button label={copied ? 'Copied text' : 'Copy text'} variant="secondary" size="footer" onPress={copy} />
        <Text style={[type.label, s.secondary]}>Where did you post it?</Text>
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
        <Button label="Mark as published" size="footer" onPress={markPublished} />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: layout.gutter, paddingTop: space.l },
  secondary: { color: colors.textSecondary },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, paddingBottom: space.xxl, gap: layout.cardGap },
  bleed: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: layout.gutter },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  grow: { flex: 1 },
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
  small: { paddingHorizontal: space.m },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: size.tap,
    paddingHorizontal: space.m,
    borderRadius: radius.small,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  square: { width: SQUARE, height: SQUARE, borderRadius: SQUARE / 3, backgroundColor: colors.logs.fill, borderWidth: border.width, borderColor: border.color },
  sourceTitle: { flex: 1, fontSize: 15 },
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
