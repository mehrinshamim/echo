import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, size, space, type } from '../theme';

type Props = { label?: string; onPress?: () => void; onInk?: boolean };

const ICON = 18;

export function BackPill({ label = 'Back', onPress, onInk }: Props) {
  const fg = onInk ? colors.onInk : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={({ pressed: p }) => [s.pill, { borderColor: fg, opacity: p ? pressed : 1 }, !onInk && s.card]}
    >
      <Feather name="arrow-left" size={ICON} color={fg} />
      <Text style={[type.tab, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: {
    height: size.back,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.s,
    paddingRight: space.m + 2,
    borderRadius: radius.pill,
    borderWidth: border.width,
    alignSelf: 'flex-start',
  },
  card: { backgroundColor: colors.card },
});
