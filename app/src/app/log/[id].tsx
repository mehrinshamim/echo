import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { relatedLogs } from '@/api';
import { dayLabel, timeOfDay } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Log } from '@/types';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Header } from '@/ui/Header';
import { Segmented } from '@/ui/Segmented';
import { Timeline } from '@/ui/Timeline';

type Tab = 'tx' | 'sum' | 'rel';
const TABS: { key: Tab; label: string }[] = [
  { key: 'tx', label: 'Transcript' },
  { key: 'sum', label: 'Summary' },
  { key: 'rel', label: 'Related' },
];
const COPIED_MS = 1500;
const SOURCE: Record<Log['source'], string> = { voice: 'Captured', typed: 'Typed', mixed: 'Typed + captured' };

/** Result of a capture (unsaved) and the detail view of a saved log: same screen, same tabs. */
export default function LogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { logs, themes, updateLog, removeLog, addTheme } = useStore();
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
        <Header />
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
  const unpicked = themes.filter((t) => !log.themeIds.includes(t.id));

  return (
    <View style={s.root}>
      <Header back={log.saved ? 'Back' : 'Discard'} onBack={log.saved ? undefined : discard} />
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxxl * 3 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={type.meta}>
          {dayLabel(log.createdAt)} · {timeOfDay(log.createdAt)} · {SOURCE[log.source]}
        </Text>
        <Text style={type.h1}>{log.title}</Text>
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'tx' && (
          <Card style={s.gap}>
            <View style={s.row}>
              <Text style={type.label}>Transcript · tap to fix words</Text>
              <Button
                label={copied ? 'Copied' : 'Copy'}
                icon={copied ? 'check' : 'copy'}
                variant="secondary"
                onPress={copy}
                style={s.copy}
              />
            </View>
            <TextInput
              style={[type.body, s.transcript]}
              value={log.transcript}
              onChangeText={(transcript) => set({ transcript })}
              multiline
              scrollEnabled={false}
            />
          </Card>
        )}

        {tab === 'sum' && (
          <>
            <Card style={s.gap}>
              <Text style={type.label}>Title</Text>
              <TextInput style={type.h2} value={log.title} onChangeText={(title) => set({ title })} />
            </Card>
            <Card style={s.gap}>
              <Text style={type.label}>Themes</Text>
              <View style={s.chips}>
                {log.themeIds.map((tid) => {
                  const t = themes.find((x) => x.id === tid);
                  return t ? (
                    <Chip
                      key={tid}
                      section="themes"
                      label={t.name}
                      onRemove={() => set({ themeIds: log.themeIds.filter((x) => x !== tid) })}
                    />
                  ) : null;
                })}
                {!picking && <Chip section="themes" label="Theme" add onPress={() => setPicking(true)} />}
              </View>
              {picking && (
                <View style={s.gap}>
                  {unpicked.length > 0 && (
                    <View style={s.chips}>
                      {unpicked.map((t) => (
                        <Chip
                          key={t.id}
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
                      style={[type.body, s.field]}
                      value={newTheme}
                      onChangeText={setNewTheme}
                      placeholder="New theme name"
                      placeholderTextColor={colors.placeholder}
                      onSubmitEditing={addThemeByName}
                      returnKeyType="done"
                    />
                    <Button label="Add" variant="secondary" onPress={addThemeByName} />
                  </View>
                </View>
              )}
            </Card>
            <Card style={s.gap}>
              <Text style={type.label}>Summary</Text>
              <Text style={type.body}>{log.summary}</Text>
            </Card>
            <Card style={s.gap}>
              <Text style={type.label}>Key points</Text>
              {log.keyPoints.map((p) => (
                <View key={p} style={s.point}>
                  <View style={s.bullet} />
                  <Text style={[type.body, s.flex]}>{p}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {tab === 'rel' && (
          <View style={s.gap}>
            <Text style={type.meta}>Earlier logs on the same thread</Text>
            {related === null ? (
              <Text style={type.body}>Looking through your logs…</Text>
            ) : related.length ? (
              <Timeline
                section="logs"
                items={related.map((l) => ({ id: l.id, date: dayLabel(l.createdAt), title: l.title, text: l.summary }))}
                onPress={(rid) => router.push(`/log/${rid}`)}
              />
            ) : (
              <Text style={type.body}>Nothing related yet. It will show up as you log more.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {!log.saved && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
          <Button
            label="Save log"
            icon="check"
            onPress={() => {
              set({ saved: true });
              router.back();
            }}
          />
        </View>
      )}
    </View>
  );
}

const BULLET = 8;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: layout.gutter },
  content: { paddingHorizontal: layout.gutter, gap: layout.cardGap },
  gap: { gap: space.m },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  copy: { height: size.tap, paddingHorizontal: space.l },
  transcript: { padding: 0, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  field: {
    flex: 1,
    height: size.btnSecondary,
    paddingHorizontal: space.l,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  point: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  bullet: { width: BULLET, height: BULLET, borderRadius: radius.pill, backgroundColor: colors.themes.line, marginTop: 8 },
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
