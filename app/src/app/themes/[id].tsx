import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeReport } from '@/api';
import { shortDate } from '@/format';
import { newId, useStore } from '@/store';
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
  const { themes, logs, addChat } = useStore();
  const insets = useSafeAreaInsets();
  const theme = themes.find((t) => t.id === id);
  const [tab, setTab] = useState<Tab>('evo');
  const [report, setReport] = useState<ThemeReport | null>(null);
  const own = logs.filter((l) => l.saved && l.themeIds.includes(id));

  useEffect(() => {
    if (theme) themeReport(theme, logs).then(setReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report is per theme, regenerated on open
  }, [theme?.id]);

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
    const chatId = newId('ch');
    addChat({ id: chatId, createdAt: new Date().toISOString(), title: theme.name, themeIds: [theme.id], logIds: [], messages: [] });
    router.push(`/chats/${chatId}`);
  };

  const dates = own.map((l) => l.createdAt).sort();
  const range = dates.length ? (month(dates[0]) === month(dates[dates.length - 1]) ? month(dates[0]) : `${month(dates[0])} to ${month(dates[dates.length - 1])}`) : '';
  const shifts = report?.shifts ?? [];
  const then = shifts[0];
  const now = shifts.length > 1 ? shifts[shifts.length - 1] : undefined;

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
            {own.length} {own.length === 1 ? 'log' : 'logs'}
            {range ? ` · ${range}` : ''}
          </Text>
        </View>
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'evo' && (
          <View style={s.sections}>
            <Text style={type.bodyLg}>{report ? report.summary : 'Reading your logs…'}</Text>
            {then && now && (
              <View style={s.pair}>
                <View style={[s.quote, s.flex]}>
                  <Text style={[type.label, s.small]}>Then · {month(then.date)}</Text>
                  <Text style={type.bodyStrong}>“{then.text}”</Text>
                </View>
                <View style={[s.quote, s.flex]}>
                  <View style={s.strip} />
                  <Text style={[type.label, s.small, s.nowLabel]}>Now · {month(now.date)}</Text>
                  <Text style={type.bodyStrong}>“{now.text}”</Text>
                </View>
              </View>
            )}
            {!!shifts.length && (
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
              <Text style={type.bodyStrong}>What's still unresolved about {theme.name.toLowerCase()}?</Text>
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
