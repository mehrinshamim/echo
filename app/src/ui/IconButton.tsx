import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, size } from '../theme';

type Props = { icon: ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; onInk?: boolean };

export function IconButton({ icon, label, onPress, onInk }: Props) {
  const fg = onInk ? colors.onInk : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed: p }) => [s.btn, { borderColor: fg, opacity: p ? pressed : 1 }]}
    >
      <Feather name={icon} size={size.icon} color={fg} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    width: size.tap,
    height: size.tap,
    borderRadius: radius.pill,
    borderWidth: border.width,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
