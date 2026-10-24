import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { dayLabel, durationLabel, timeOfDay } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Log } from '@/types';
import { BackPill } from '@/ui/BackPill';
import { Timeline } from '@/ui/Timeline';

const SWATCH = 14;
const SEARCH_HEIGHT = 52;

export default function Logs() {
  const { logs, themes } = useStore();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const m = new Map<string, Log[]>();
    logs
      .filter((l) => l.saved && (!q || `${l.title} ${l.transcript}`.toLowerCase().includes(q)))
      .forEach((l) => {
        const k = dayLabel(l.createdAt);
        m.set(k, [...(m.get(k) ?? []), l]);
      });
    return [...m.entries()];
  }, [logs, query]);
  const meta = (l: Log) =>
    [timeOfDay(l.createdAt), durationLabel(l.seconds), themes.find((t) => t.id === l.themeIds[0])?.name]
      .filter(Boolean)
      .join(' · ');

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.head}>
          <BackPill />
          <View style={s.title} pointerEvents="none">
            <View style={s.swatch} />
            <Text style={type.h2}>Logs</Text>
          </View>
        </View>
        <View style={s.search}>
          <TextInput
            style={[type.body, s.searchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search logs"
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
          />
          <Feather name="search" size={18} color={colors.placeholder} />
        </View>
        {!groups.length && (
          <Text style={type.body}>{query ? 'No logs match that search.' : 'No logs yet. Capture or type one from Home.'}</Text>
        )}
        {groups.map(([day, items]) => (
          <View key={day} style={s.group}>
            <Text style={[type.tab, s.day]}>{day}</Text>
            <Timeline
              section="logs"
              items={items.map((l) => ({ id: l.id, title: l.title, meta: meta(l) }))}
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
  content: { paddingHorizontal: layout.gutter, gap: space.l },
  head: { minHeight: size.tap, justifyContent: 'center' },
  title: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 4,
    backgroundColor: colors.logs.fill,
    borderWidth: border.width,
    borderColor: border.color,
  },
  search: {
    height: SEARCH_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.l + 2,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, padding: 0 },
  group: { gap: space.s },
  day: { color: colors.textSecondary },
});
