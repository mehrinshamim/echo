import { Pressable, StyleSheet, Text } from 'react-native';
import { border, colors, radius, size, type } from '../theme';

const HIT = (size.tap - size.citation) / 2;

export function CitationPill({ n, onPress }: { n: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Source ${n}`}
      onPress={onPress}
      hitSlop={HIT}
      style={s.pill}
    >
      <Text style={[type.label, s.text]}>{n}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: {
    minWidth: size.citation,
    height: size.citation,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.logs.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 12, lineHeight: 14 },
});
