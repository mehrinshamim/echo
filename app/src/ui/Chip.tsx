import { Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, borderDashed, colors, pressed, radius, Section, size, space, type } from '../theme';

type Props = {
  label: string;
  section: Section;
  onPress?: () => void;
  onRemove?: () => void;
  /** "+ Theme" style chip: white fill with a plus icon. */
  add?: boolean;
  /** Dashed outline, transparent fill: "+ Style" / "+ Log" in the Write mode screens. */
  dashed?: boolean;
  /** Unselected choice: white fill, solid border, no icon (e.g. the other styles in a draft). */
  plain?: boolean;
};

// Chips are 38 tall (design token); the slop brings the tap target up to the 44 minimum.
const HIT_SLOP = { top: (size.tap - size.chip) / 2, bottom: (size.tap - size.chip) / 2 };

export function Chip({ label, section, onPress, onRemove, add, dashed, plain }: Props) {
  const fill = dashed ? 'transparent' : add || plain ? colors.card : colors[section].fill;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={onRemove && !onPress ? `Remove ${label}` : label}
      onPress={onPress ?? onRemove}
      disabled={!onPress && !onRemove}
      hitSlop={HIT_SLOP}
      style={({ pressed: p }) => [s.chip, { backgroundColor: fill, opacity: p ? pressed : 1 }, dashed && borderDashed]}
    >
      {(add || dashed) && <Feather name="plus" size={16} color={colors.ink} />}
      <Text style={type.label}>{label}</Text>
      {onRemove && <Feather name="x" size={16} color={colors.ink} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    height: size.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.m,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
  },
});
