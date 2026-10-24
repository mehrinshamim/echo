import { Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, pressed, radius, size } from '../theme';

type Props = { onPress: () => void; label?: string; disabled?: boolean };

/** Ink circle with an up arrow: sends a chat message or "Write it" in the post chat. */
export function SendButton({ onPress, label = 'Send', disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed: p }) => [s.btn, { opacity: disabled ? 0.4 : p ? pressed : 1 }]}
    >
      <Feather name="arrow-up" size={size.icon} color={colors.onInk} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    width: size.tap,
    height: size.tap,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
