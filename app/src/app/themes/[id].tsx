import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { shortDate } from '@/format';
import { localId, useStore } from '@/store';
import { border, borderDashed, colors, layout, radius, size, space, type } from '@/theme';
import type { ThemeReport } from '@/types';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Segmented';
import { Timeline } from '@/ui/Timeline';

type Tab = 'evo' | 'all';
const TABS: { key: Tab; label: string }[] = [
  { key: 'evo', label: 'How it changed' },
  { key: 'all', label: 'All logs' },
];

const month = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long' });

export default function ThemeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themes, logs, upsertChat } = useStore();
  const insets = useSafeAreaInsets();
  const theme = themes.find((t) => t.id === id);
  const [tab, setTab] = useState<Tab>('evo');
  const [report, setReport] = useState<ThemeReport | null>(null);

  // Logs that belong to this theme (from the cached list that uses primaryTheme).
  const own = logs.filter((l) => l.primaryTheme?.id === id);

  useEffect(() => {
    if (!id) return;
    api.themeReport(id).then(setReport).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report is per theme, regenerated on open
  }, [id]);

  if (!theme) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.s }]}>
        <View style={s.pad}>
          <BackPill label="Themes" />
        </View>
        <Text style={[type.body, s.pad]}>This theme no longer exists.</Text>
      </View>
    );
  }

  const askAboutTheme = () => {
    const chatId = localId();
    upsertChat({ id: chatId, title: theme.name, themeIds: [theme.id], logIds: [], updatedAt: new Date().toISOString(), messages: [], local: true });
    router.push(`/chats/${chatId}`);
  };

  const logCount = theme.logCount;
  const dates = own.map((l) => l.createdAt).sort();
  const range =
    dates.length
      ? month(dates[0]) === month(dates[dates.length - 1])
        ? month(dates[0])
        : `${month(dates[0])} to ${month(dates[dates.length - 1])}`
      : '';

  // Map the new ThemeReport shape from the API.
  const okReport = report?.status === 'ok' ? report : null;
  const then = okReport?.then;
  const now = okReport?.now;
  const shifts = okReport?.shifts ?? [];
  const openQuestion = okReport?.openQuestion;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={s.row}>
          <BackPill label="Themes" />
          <Pressable accessibilityRole="button" onPress={askAboutTheme} style={s.ask}>
            <Text style={type.tab}>Ask this theme</Text>
          </Pressable>
        </View>
        <View style={s.hero}>
          <Text style={s.heroTitle}>{theme.name}</Text>
          <Text style={[type.tab, s.heroMeta]}>
            {logCount} {logCount === 1 ? 'log' : 'logs'}
            {range ? ` · ${range}` : ''}
          </Text>
        </View>
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'evo' && (
          <View style={s.sections}>
            <Text style={type.bodyLg}>
              {okReport ? okReport.overview : report?.status === 'not_enough_history' ? 'Not enough logs yet to show how this theme changed.' : 'Reading your logs…'}
            </Text>
            {then && now && (
              <View style={s.pair}>
                <View style={[s.quote, s.flex]}>
                  <Text style={[type.label, s.small]}>Then · {month(then.date)}</Text>
                  <Text style={type.bodyStrong}>"{then.quote}"</Text>
                </View>
                <View style={[s.quote, s.flex]}>
                  <View style={s.strip} />
                  <Text style={[type.label, s.small, s.nowLabel]}>Now · {month(now.date)}</Text>
                  <Text style={type.bodyStrong}>"{now.quote}"</Text>
                </View>
              </View>
            )}
            {shifts.length > 0 && (
              <>
                <Text style={[type.h2, s.h3]}>What changed</Text>
                <Timeline
                  section="themes"
                  variant="plain"
                  items={shifts.map((sh) => ({ id: sh.logId, date: shortDate(sh.date), title: sh.text }))}
                  onPress={(lid) => router.push(`/log/${lid}`)}
                />
              </>
            )}
            <View style={s.open}>
              <Text style={[type.label, s.secondary]}>Still open</Text>
              <Text style={type.bodyStrong}>{openQuestion ?? `What's still unresolved about ${theme.name.toLowerCase()}?`}</Text>
              <Button label="Answer out loud" onPress={() => router.push('/capture')} style={s.answer} />
            </View>
          </View>
        )}

        {tab === 'all' && (
          <Timeline
            section="themes"
            dateRight
            items={own.map((l) => ({ id: l.id, date: shortDate(l.createdAt), title: l.title }))}
            onPress={(lid) => router.push(`/log/${lid}`)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: layout.gutter },
  content: { paddingHorizontal: layout.gutter, gap: space.l },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  secondary: { color: colors.textSecondary },
  ask: {
    height: size.tap,
    paddingHorizontal: space.m + 2,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.chats.fill,
  },
  hero: {
    backgroundColor: colors.themes.fill,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    padding: space.l,
    gap: 6,
  },
  heroTitle: { ...type.h1, lineHeight: 29 },
  heroMeta: { fontFamily: 'Archivo_600SemiBold' },
  sections: { gap: space.l },
  pair: { flexDirection: 'row', gap: space.s + 2 },
  quote: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.tile,
    padding: space.m,
    gap: 6,
    overflow: 'hidden',
  },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, height: size.themeStrip, backgroundColor: colors.themes.line },
  small: { fontSize: 13, color: colors.textSecondary },
  nowLabel: { marginTop: space.xs },
  h3: { fontSize: 17 },
  open: { ...borderDashed, borderRadius: radius.tile, backgroundColor: colors.card, padding: space.m + 2, gap: space.s + 2 },
  answer: { alignSelf: 'flex-start', height: size.tap, paddingHorizontal: space.l },
});
