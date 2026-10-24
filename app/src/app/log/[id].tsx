import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as api from '@/api';
import { errorText } from '@/client';
import { durationLabel, shortDate, wordCount } from '@/format';
import { localId, useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Log, RelatedLog } from '@/types';
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

/** Detail view for a saved log (all logs are server-saved). */
export default function LogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { logs, themes, addLog, upsertChat } = useStore();
  const insets = useSafeAreaInsets();

  // Use the cached log if it has full fields; otherwise fetch from API.
  const stored = logs.find((l) => l.id === id);
  const [log, setLog] = useState<Log | null>(stored && 'keyPoints' in stored ? (stored as Log) : null);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState<Tab>('tx');
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const [newTheme, setNewTheme] = useState('');
  const [themeErr, setThemeErr] = useState('');

  // Fetch the full log from the API if not already in cache with full fields.
  useEffect(() => {
    if (log) return;
    api
      .getLog(id)
      .then((fetched) => {
        setLog(fetched);
        addLog(fetched);
      })
      .catch((e) => setLoadErr(errorText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loadErr) {
    return (
      <View style={s.root}>
        <View style={[s.top, { paddingTop: insets.top + space.s }]}>
          <BackPill label="Home" />
        </View>
        <Text style={[type.body, s.pad]}>{loadErr}</Text>
      </View>
    );
  }

  if (!log) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const copy = async () => {
    await Clipboard.setStringAsync(log.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  const addThemeByName = async () => {
    const name = newTheme.trim();
    if (!name) return;
    setThemeErr('');
    try {
      const updated = await api.addLogTheme(log.id, name);
      setLog(updated);
      addLog(updated);
    } catch (e) {
      setThemeErr(errorText(e));
    }
    setNewTheme('');
    setPicking(false);
  };

  const addThemeById = async (themeId: string, themeName: string) => {
    setThemeErr('');
    try {
      const updated = await api.addLogTheme(log.id, themeName);
      setLog(updated);
      addLog(updated);
    } catch (e) {
      setThemeErr(errorText(e));
    }
    setPicking(false);
  };

  const removeTheme = async (themeId: string) => {
    setThemeErr('');
    try {
      const updated = await api.removeLogTheme(log.id, themeId);
      setLog(updated);
      addLog(updated);
    } catch (e) {
      setThemeErr(errorText(e));
    }
  };

  const askAboutThis = () => {
    const chatId = localId();
    upsertChat({ id: chatId, title: log.title, themeIds: [], logIds: [log.id], updatedAt: new Date().toISOString(), messages: [], local: true });
    router.push(`/chats/${chatId}`);
  };

  const logThemes = log.themes ?? [];
  const unpicked = themes.filter((t) => !logThemes.some((lt) => lt.id === t.id));
  const day = new Date(log.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const relatedItems: { id: string; date?: string; title: string }[] = (log.related ?? []).map((r: RelatedLog) => ({
    id: r.logId,
    date: [shortDate(r.date), r.theme].filter(Boolean).join(' · '),
    title: `"${r.snippet}"`,
  }));

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.row}>
          <BackPill label="Home" onPress={() => router.replace('/')} />
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
            {/* Transcript is read-only after saving — the server owns it. */}
            <Text style={[type.bodyLg, s.transcript]} selectable>
              {log.transcript}
            </Text>
          </View>
        )}

        {tab === 'sum' && (
          <View style={s.sections}>
            <View style={s.block}>
              <Text style={[type.label, s.secondary]}>Themes · tap to edit</Text>
              <View style={s.chips}>
                {logThemes.map((t) => (
                  <Chip
                    key={t.id}
                    large
                    section="themes"
                    label={t.name}
                    onRemove={() => removeTheme(t.id)}
                  />
                ))}
                {!picking && <Chip large dashed section="themes" label="Add theme" onPress={() => setPicking(true)} />}
              </View>
              {!!themeErr && <Text style={[type.meta, { color: colors.recording }]}>{themeErr}</Text>}
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
                          onPress={() => addThemeById(t.id, t.name)}
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
            {relatedItems.length > 0 ? (
              <Timeline
                section="logs"
                items={relatedItems}
                onPress={(rid) => router.push(`/log/${rid}`)}
              />
            ) : (
              <Text style={type.body}>Nothing related yet. It will show up as you log more.</Text>
            )}
            {!!logThemes[0] && (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(`/themes/${logThemes[0].id}`)}
                style={s.link}
              >
                <Text style={[type.tab, s.underline]}>See how your thinking changed</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
        <Button label="Ask about this" variant="secondary" size="md" onPress={askAboutThis} style={s.grow} />
        <Button
          label="Make a post"
          size="md"
          onPress={() => router.push({ pathname: '/write-mode/chat', params: { logId: log.id } })}
          style={s.grow}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
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
