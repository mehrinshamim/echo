import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, Section, space, type } from '../theme';

type Row = {
  section: Section;
  title: string;
  count: number;
  icon: ComponentProps<typeof Feather>['name'];
  onPress: () => void;
};

const ROW = 60;
const CHIP = 34;

/** Home's grouped list: one white card, a row per section with a colored icon chip, count and ›. */
export function NavList({ rows }: { rows: Row[] }) {
  return (
    <View style={s.card}>
      {rows.map((r, i) => (
        <Pressable
          key={r.title}
          accessibilityRole="button"
          accessibilityLabel={`${r.title}, ${r.count}`}
          onPress={r.onPress}
          style={({ pressed: p }) => [s.row, i < rows.length - 1 && s.divider, { opacity: p ? pressed : 1 }]}
        >
          <View style={[s.chip, { backgroundColor: colors[r.section].fill }]}>
            <Feather name={r.icon} size={18} color={colors.ink} />
          </View>
          <Text style={[type.h2, s.title]}>{r.title}</Text>
          <Text style={type.meta}>{r.count}</Text>
          <Text style={type.h2}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: space.m + 2, paddingHorizontal: space.l },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { width: CHIP, height: CHIP, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17 },
});
