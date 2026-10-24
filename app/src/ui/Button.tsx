import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, size, space, type } from '../theme';

type Variant = 'primary' | 'secondary' | 'onInk' | 'white';
type Size = 'lg' | 'md' | 'footer' | 'sm' | 'xs';

type Props = {
  label: string;
  onPress: () => void;
  /** primary: ink fill. secondary: white fill, ink border. onInk: outline on the ink Write bar. white: borderless white on the ink Write bar. */
  variant?: Variant;
  /** Heights from the design: lg 58, md 54, footer 52, sm 40, xs 36. Default keeps 56 (primary) / 48 (others). */
  size?: Size;
  icon?: ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  style?: ViewStyle;
};

const HEIGHT: Record<Size, number> = {
  lg: size.btnLg,
  md: size.btnMd,
  footer: size.btnFooter,
  sm: size.btnSm,
  xs: size.btnXs,
};

export function Button({ label, onPress, variant = 'primary', size: sz, icon, disabled, style }: Props) {
  const fg = variant === 'primary' || variant === 'onInk' ? colors.onInk : colors.ink;
  const small = sz === 'sm' || sz === 'xs';
  const height = sz ? HEIGHT[sz] : variant === 'primary' ? size.btnPrimary : size.btnSecondary;
  const slop = height < size.tap ? (size.tap - height) / 2 : 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop ? { top: slop, bottom: slop } : undefined}
      style={({ pressed: p }) => [
        s.base,
        { height },
        small && s.small,
        variant === 'primary' && s.primary,
        variant === 'secondary' && s.secondary,
        variant === 'onInk' && s.onInk,
        variant === 'white' && s.white,
        { opacity: disabled ? 0.4 : p ? pressed : 1 },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={small ? 16 : size.icon} color={fg} />}
      <Text style={[small || sz === 'footer' ? type.tab : type.button, { color: fg }]}>{label}</Text>
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
  small: { paddingHorizontal: space.m + 2 },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.card },
  onInk: { backgroundColor: 'transparent', borderColor: colors.onInk },
  white: { backgroundColor: colors.card, borderWidth: 0 },
});
