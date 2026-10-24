import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ago } from '@/format';
import { useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import { Header } from '@/ui/Header';
import { ThemeCard } from '@/ui/ThemeCard';

export default function Themes() {
  const { themes, logs } = useStore();
  const insets = useSafeAreaInsets();
  const rows = themes
    .map((t) => {
      const own = logs.filter((l) => l.saved && l.themeIds.includes(t.id));
      return { t, count: own.length, last: own[0]?.createdAt };
    })
    .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''));

  return (
    <View style={s.root}>
      <Header title="Themes" back="Home" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {!rows.length && <Text style={type.body}>Themes appear as your logs start to repeat ideas.</Text>}
        {rows.map(({ t, count, last }) => (
          <ThemeCard
            key={t.id}
            name={t.name}
            meta={`${count} ${count === 1 ? 'log' : 'logs'}${last ? ` · ${ago(last)}` : ''}`}
            onPress={() => router.push(`/themes/${t.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, gap: layout.cardGap },
});
