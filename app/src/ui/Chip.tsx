import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, borderDashed, colors, pressed, radius, Section, size, space, type } from '../theme';

type Props = {
  label: string;
  section: Section;
  onPress?: () => void;
  onRemove?: () => void;
  /** "+ Theme" style chip: white fill, the label is shown as "+ {label}". */
  add?: boolean;
  /** Dashed outline, transparent fill, shown as "+ {label}": add actions in the Write mode screens. */
  dashed?: boolean;
  /** Unselected choice: white fill, solid border (e.g. the other styles in a draft). */
  plain?: boolean;
  /** 40 tall (draft and result chips) instead of the default 36. */
  large?: boolean;
};

const REMOVE_BOX = 28;

export function Chip({ label, section, onPress, onRemove, add, dashed, plain, large }: Props) {
  const fill = dashed ? 'transparent' : add || plain ? colors.card : colors[section].fill;
  const height = large ? size.chipLg : size.chip;
  const slop = (size.tap - height) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={onRemove && !onPress ? `Remove ${label}` : label}
      onPress={onPress ?? onRemove}
      disabled={!onPress && !onRemove}
      hitSlop={{ top: slop, bottom: slop }}
      style={({ pressed: p }) => [
        s.chip,
        { height, backgroundColor: fill, opacity: p ? pressed : 1 },
        !!onRemove && s.withRemove,
        dashed && borderDashed,
      ]}
    >
      <Text style={type.label}>{add || dashed ? `+ ${label}` : label}</Text>
      {onRemove && (
        <View style={s.remove}>
          <Feather name="x" size={16} color={colors.ink} />
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.m,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
  },
  withRemove: { paddingRight: space.xs },
  remove: { width: REMOVE_BOX, height: REMOVE_BOX, alignItems: 'center', justifyContent: 'center' },
});
