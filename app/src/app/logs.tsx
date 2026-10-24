import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayLabel, timeOfDay } from '@/format';
import { useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import type { Log } from '@/types';
import { Header } from '@/ui/Header';
import { Timeline } from '@/ui/Timeline';

export default function Logs() {
  const { logs } = useStore();
  const insets = useSafeAreaInsets();
  const groups = useMemo(() => {
    const m = new Map<string, Log[]>();
    logs
      .filter((l) => l.saved)
      .forEach((l) => {
        const k = dayLabel(l.createdAt);
        m.set(k, [...(m.get(k) ?? []), l]);
      });
    return [...m.entries()];
  }, [logs]);

  return (
    <View style={s.root}>
      <Header title="Logs" back="Home" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {!groups.length && <Text style={type.body}>No logs yet. Capture or type one from Home.</Text>}
        {groups.map(([day, items]) => (
          <View key={day} style={s.group}>
            <Text style={type.h2}>{day}</Text>
            <Timeline
              section="logs"
              items={items.map((l) => ({ id: l.id, date: timeOfDay(l.createdAt), title: l.title, text: l.summary }))}
              onPress={(id) => router.push(`/log/${id}`)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, gap: space.xxl },
  group: { gap: space.m },
});
