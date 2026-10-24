import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, size, space, type } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, style }: Props) {
  const primary = variant === 'primary';
  const fg = primary ? colors.onInk : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed: p }) => [
        s.base,
        primary ? s.primary : s.secondary,
        { opacity: disabled ? 0.4 : p ? pressed : 1 },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={size.icon} color={fg} />}
      <Text style={[type.button, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    paddingHorizontal: space.xxl,
  },
  primary: { height: size.btnPrimary, backgroundColor: colors.ink },
  secondary: { height: size.btnSecondary, backgroundColor: colors.card },
});
