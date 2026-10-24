import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { border, colors, layout, pressed, radius } from '../theme';

type Props = { children: ReactNode; onPress?: () => void; style?: ViewStyle; fill?: string };

export function Card({ children, onPress, style, fill = colors.card }: Props) {
  if (!onPress) return <View style={[s.card, { backgroundColor: fill }, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed: p }) => [s.card, { backgroundColor: fill, opacity: p ? pressed : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: border.width,
    borderColor: border.color,
    padding: layout.cardPadding,
    overflow: 'hidden',
  },
});
