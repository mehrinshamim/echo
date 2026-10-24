import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { relatedLogs } from '@/api';
import { durationLabel, shortDate, wordCount } from '@/format';
import { newId, useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Log } from '@/types';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Segmented } from '@/ui/Segmented';
import { Timeline } from '@/ui/Timeline';

type Tab = 'tx' | 'sum' | 'rel';
const TABS: { key: Tab; label: string }[] = [
  { key: 'tx', label: 'Transcript' },
  { key: 'sum', label: 'Summary' },
  { key: 'rel', label: 'Related' },
];
const COPIED_MS = 1500;
const BAR = 3;

/** Result of a capture (unsaved) and the detail view of a saved log: same screen, same tabs. */
export default function LogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { logs, themes, updateLog, removeLog, addTheme, addChat } = useStore();
  const insets = useSafeAreaInsets();
  const log = logs.find((l) => l.id === id);
  const [tab, setTab] = useState<Tab>('tx');
  const [copied, setCopied] = useState(false);
  const [related, setRelated] = useState<Log[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [newTheme, setNewTheme] = useState('');

  useEffect(() => {
    if (tab !== 'rel' || !log) return;
    setRelated(null);
    relatedLogs(log, logs).then(setRelated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch per tab visit, not on every keystroke
  }, [tab, log?.id]);

  if (!log) {
    return (
      <View style={s.root}>
        <View style={[s.top, { paddingTop: insets.top + space.s }]}>
          <BackPill label="Home" />
        </View>
        <Text style={[type.body, s.pad]}>This log no longer exists.</Text>
      </View>
    );
  }

  const set = (p: Partial<Log>) => updateLog(log.id, p);
  const copy = async () => {
    await Clipboard.setStringAsync(log.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };
  const discard = () => {
    removeLog(log.id);
    router.back();
  };
  const addThemeByName = () => {
    const name = newTheme.trim();
    if (!name) return;
    const existing = themes.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const themeId = existing?.id ?? addTheme(name);
    if (!log.themeIds.includes(themeId)) set({ themeIds: [...log.themeIds, themeId] });
    setNewTheme('');
    setPicking(false);
  };
  const askAboutThis = () => {
    const chatId = newId('ch');
    addChat({ id: chatId, createdAt: new Date().toISOString(), title: 'New chat', themeIds: [], logIds: [log.id], messages: [] });
    router.push(`/chats/${chatId}`);
  };
  const unpicked = themes.filter((t) => !log.themeIds.includes(t.id));
  const day = new Date(log.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const themeName = (l: Log) => themes.find((t) => t.id === l.themeIds[0])?.name;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.row}>
          <BackPill label={log.saved ? 'Home' : 'Discard'} onPress={log.saved ? () => router.replace('/') : discard} />
          <Text style={type.meta}>
            {day} · {durationLabel(log.seconds)}
          </Text>
        </View>
        <Text style={type.h1}>{log.title}</Text>
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'tx' && (
          <View style={s.panel}>
            <View style={s.panelHead}>
              <Text style={type.label}>Transcript · {wordCount(log.transcript)} words</Text>
              <Button
                label={copied ? 'Copied' : 'Copy'}
                icon="copy"
                onPress={copy}
                style={s.copy}
              />
            </View>
            <TextInput
              style={[type.bodyLg, s.transcript]}
              value={log.transcript}
              onChangeText={(transcript) => set({ transcript })}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
            />
          </View>
        )}

        {tab === 'sum' && (
          <View style={s.sections}>
            <View style={s.block}>
              <Text style={[type.label, s.secondary]}>Title</Text>
              <TextInput style={[type.bodyStrong, s.field]} value={log.title} onChangeText={(title) => set({ title })} />
            </View>
            <View style={s.block}>
              <Text style={[type.label, s.secondary]}>Themes · tap to edit</Text>
              <View style={s.chips}>
                {log.themeIds.map((tid) => {
                  const t = themes.find((x) => x.id === tid);
                  return t ? (
                    <Chip
                      key={tid}
                      large
                      section="themes"
                      label={t.name}
                      onRemove={() => set({ themeIds: log.themeIds.filter((x) => x !== tid) })}
                    />
                  ) : null;
                })}
                {!picking && <Chip large dashed section="themes" label="Add theme" onPress={() => setPicking(true)} />}
              </View>
              {picking && (
                <View style={s.block}>
                  {unpicked.length > 0 && (
                    <View style={s.chips}>
                      {unpicked.map((t) => (
                        <Chip
                          key={t.id}
                          large
                          section="themes"
                          label={t.name}
                          add
                          onPress={() => {
                            set({ themeIds: [...log.themeIds, t.id] });
                            setPicking(false);
                          }}
                        />
                      ))}
                    </View>
                  )}
                  <View style={s.row}>
                    <TextInput
                      style={[type.body, s.field, s.grow]}
                      value={newTheme}
                      onChangeText={setNewTheme}
                      placeholder="New theme name"
                      placeholderTextColor={colors.placeholder}
                      onSubmitEditing={addThemeByName}
                      returnKeyType="done"
                    />
                    <Button label="Add" variant="secondary" size="sm" onPress={addThemeByName} />
                  </View>
                </View>
              )}
            </View>
            <View style={s.block}>
              <Text style={[type.label, s.secondary]}>Summary</Text>
              <Text style={type.bodyLg}>{log.summary}</Text>
            </View>
            <View style={s.block}>
              <Text style={[type.label, s.secondary]}>Key points</Text>
              {log.keyPoints.map((p) => (
                <View key={p} style={s.point}>
                  <View style={s.bar} />
                  <Text style={[type.bodyStrong, s.grow]}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === 'rel' && (
          <View style={s.sections}>
            <Text style={[type.bodyStrong, s.secondary]}>You've said things like this before</Text>
            {related === null ? (
              <Text style={type.body}>Looking through your logs…</Text>
            ) : related.length ? (
              <Timeline
                section="logs"
                items={related.map((l) => ({
                  id: l.id,
                  date: [shortDate(l.createdAt), themeName(l)].filter(Boolean).join(' · '),
                  title: `“${l.keyPoints[0] ?? l.title}”`,
                }))}
                onPress={(rid) => router.push(`/log/${rid}`)}
              />
            ) : (
              <Text style={type.body}>Nothing related yet. It will show up as you log more.</Text>
            )}
            {!!log.themeIds[0] && (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(`/themes/${log.themeIds[0]}`)}
                style={s.link}
              >
                <Text style={[type.tab, s.underline]}>See how your thinking changed</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
        {log.saved ? (
          <>
            <Button label="Ask about this" variant="secondary" size="md" onPress={askAboutThis} style={s.grow} />
            <Button
              label="Make a post"
              size="md"
              onPress={() => router.push({ pathname: '/write-mode/chat', params: { logId: log.id } })}
              style={s.grow}
            />
          </>
        ) : (
          <>
            <Button label="Discard" variant="secondary" size="md" onPress={discard} style={s.grow} />
            <Button
              label="Save log"
              size="md"
              onPress={() => {
                set({ saved: true });
                router.back();
              }}
              style={s.grow}
            />
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: layout.gutter },
  pad: { paddingHorizontal: layout.gutter },
  content: { paddingHorizontal: layout.gutter, gap: space.l },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  grow: { flex: 1 },
  secondary: { color: colors.textSecondary },
  panel: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingLeft: space.l,
    paddingRight: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  copy: { height: size.tap, paddingHorizontal: space.l },
  transcript: { padding: space.l, minHeight: 120 },
  sections: { gap: 18 },
  block: { gap: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  field: {
    minHeight: size.tap,
    paddingHorizontal: space.l,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.small,
    backgroundColor: colors.card,
  },
  point: { flexDirection: 'row', gap: space.m },
  bar: { width: BAR, borderRadius: 2, backgroundColor: colors.logs.line },
  link: { alignSelf: 'flex-start', minHeight: size.tap, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  footer: {
    flexDirection: 'row',
    gap: space.s + 2,
    paddingHorizontal: layout.gutter,
    paddingTop: space.s + 2,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
