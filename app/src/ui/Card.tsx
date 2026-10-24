import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { border, colors, layout, pressed, radius as radii } from '../theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  fill?: string;
  /** Corner radius: 20 for panels (default), 16 for list cards, 14 for small cards. */
  radius?: number;
};

export function Card({ children, onPress, style, fill = colors.card, radius = radii.card }: Props) {
  const base = [s.card, { backgroundColor: fill, borderRadius: radius }];
  if (!onPress) return <View style={[...base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed: p }) => [...base, { opacity: p ? pressed : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: border.width,
    borderColor: border.color,
    padding: layout.cardPadding,
    overflow: 'hidden',
  },
});
