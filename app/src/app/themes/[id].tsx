import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeReport } from '@/api';
import { dayLabel, shortDate } from '@/format';
import { newId, useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import type { ThemeReport } from '@/types';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';
import { Segmented } from '@/ui/Segmented';
import { Timeline } from '@/ui/Timeline';

type Tab = 'evo' | 'all';
const TABS: { key: Tab; label: string }[] = [
  { key: 'evo', label: 'How it changed' },
  { key: 'all', label: 'All logs' },
];

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
      <View style={s.root}>
        <Header />
        <Text style={[type.body, s.pad]}>This theme no longer exists.</Text>
      </View>
    );
  }

  const askAboutTheme = () => {
    const chatId = newId('ch');
    addChat({ id: chatId, createdAt: new Date().toISOString(), title: theme.name, themeIds: [theme.id], logIds: [], messages: [] });
    router.push(`/chats/${chatId}`);
  };

  return (
    <View style={s.root}>
      <Header title={theme.name} back="Themes" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={type.meta}>
          {own.length} {own.length === 1 ? 'log' : 'logs'}
          {own.length ? ` · since ${shortDate(own[own.length - 1].createdAt)}` : ''}
        </Text>
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'evo' && (
          <>
            <Card fill={colors.themes.fill}>
              <Text style={type.body}>{report ? report.summary : 'Reading your logs…'}</Text>
            </Card>
            {!!report?.shifts.length && (
              <Timeline
                section="themes"
                items={report.shifts.map((sh) => ({ id: sh.logId, date: shortDate(sh.date), title: logs.find((l) => l.id === sh.logId)?.title ?? '', text: sh.text }))}
                onPress={(lid) => router.push(`/log/${lid}`)}
              />
            )}
            <Button label="Ask about this theme" icon="message-circle" variant="secondary" onPress={askAboutTheme} />
          </>
        )}

        {tab === 'all' && (
          <Timeline
            section="themes"
            items={own.map((l) => ({ id: l.id, date: dayLabel(l.createdAt), title: l.title, text: l.summary }))}
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
  content: { paddingHorizontal: layout.gutter, gap: layout.cardGap },
});
