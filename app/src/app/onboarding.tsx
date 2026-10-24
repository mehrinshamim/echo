import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { border, colors, radius, space, type } from '@/theme';
import { Button } from '@/ui/Button';

const ROWS = [
  { color: colors.logs.fill, text: 'Log what you said' },
  { color: colors.themes.fill, text: 'See the themes that keep coming back' },
  { color: colors.chats.fill, text: 'Ask, then write in your own voice' },
] as const;

const SIDE = 22;
const ROW = 56;
const SWATCH = 30;

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top + space.m, paddingBottom: insets.bottom + SIDE }]}>
      <Text style={s.wordmark}>echo</Text>
      <View style={s.card}>
        {ROWS.map((r, i) => (
          <View key={r.text} style={[s.row, i < ROWS.length - 1 && s.divider]}>
            <View style={[s.swatch, { backgroundColor: r.color }]} />
            <Text style={[type.button, s.rowText]}>{r.text}</Text>
          </View>
        ))}
      </View>
      <Text style={s.title}>Say it once.{'\n'}Find it again.</Text>
      <Text style={type.bodyLg}>
        Talk through what happened at an event. Echo writes it down, groups it by topic, and helps you post about it
        later.
      </Text>
      <View style={s.spacer} />
      <Button
        label="Get started"
        size="lg"
        onPress={() => {
          completeOnboarding();
          router.replace('/sign-in');
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SIDE, backgroundColor: colors.bg, gap: 18 },
  wordmark: { fontFamily: 'Archivo_800ExtraBold', fontSize: 22, letterSpacing: -0.44, color: colors.ink },
  card: {
    marginTop: space.m,
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.m + 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: 9 },
  rowText: { flex: 1 },
  title: { ...type.h1Lg, lineHeight: 37, marginTop: space.l },
  spacer: { flex: 1 },
});
