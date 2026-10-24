import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, pressed, Section, size, space, type } from '../theme';

export type TimelineItem = { id: string; date: string; title: string; text?: string };

type Props = { items: TimelineItem[]; section: Section; onPress?: (id: string) => void };

export function Timeline({ items, section, onPress }: Props) {
  const line = colors[section].line;
  return (
    <View>
      {items.map((it, i) => (
        <Pressable
          key={it.id}
          accessibilityRole="button"
          disabled={!onPress}
          onPress={() => onPress?.(it.id)}
          style={({ pressed: p }) => [s.row, { opacity: p ? pressed : 1 }]}
        >
          <View style={s.rail}>
            <View style={[s.dot, { backgroundColor: line }]} />
            {i < items.length - 1 && <View style={[s.line, { backgroundColor: line }]} />}
          </View>
          <View style={s.body}>
            <Text style={type.meta}>{it.date}</Text>
            <Text style={type.bodyStrong}>{it.title}</Text>
            {!!it.text && (
              <Text style={type.body} numberOfLines={3}>
                {it.text}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.m, minHeight: size.tap },
  rail: { width: size.dot, alignItems: 'center' },
  dot: { width: size.dot, height: size.dot, borderRadius: size.dot / 2, marginTop: 4 },
  line: { width: size.line, flex: 1, marginTop: 2 },
  body: { flex: 1, gap: 2, paddingBottom: space.xl },
});
