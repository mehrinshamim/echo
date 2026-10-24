import { Pressable, StyleSheet, Text, View } from 'react-native';
import { border, colors, pressed, radius, Section, size, space, type } from '../theme';

export type TimelineItem = { id: string; date?: string; title: string; meta?: string; text?: string };

type Props = {
  items: TimelineItem[];
  section: Section;
  onPress?: (id: string) => void;
  /** Overrides the section's line color (Published posts use ink). */
  color?: string;
  /** cards: each item is a white bordered card on the line. plain: bare text on the line ("What changed"). */
  variant?: 'cards' | 'plain';
  /** Cards only: title on the left and the date on the right, on one row. */
  dateRight?: boolean;
};

const RAIL = space.xxl - space.xs; // 20 → line sits at left 5, dots overhang to the card's left
const DOT_TOP = { cards: 18, plain: 4 } as const;

/** Vertical timeline: a 2px line, 12px dots and (by default) a card per entry. */
export function Timeline({ items, section, onPress, color, variant = 'cards', dateRight }: Props) {
  const line = color ?? colors[section].line;
  const cards = variant === 'cards';
  return (
    <View style={[s.wrap, { paddingLeft: RAIL + 2 }]}>
      <View style={[s.line, { backgroundColor: line, top: cards ? 0 : 6, bottom: cards ? 0 : 6 }]} />
      {items.map((it) => {
        const body = (
          <>
            <View style={[s.dot, { backgroundColor: line, top: DOT_TOP[variant] }]} />
            {dateRight ? (
              <View style={s.split}>
                <Text style={[type.bodyStrong, s.grow]}>{it.title}</Text>
                <Text style={type.meta}>{it.date}</Text>
              </View>
            ) : (
              <>
                {!!it.date && <Text style={[type.label, s.secondary]}>{it.date}</Text>}
                <Text style={cards ? type.bodyStrong : [type.bodyStrong, s.plainTitle]}>{it.title}</Text>
              </>
            )}
            {!!it.meta && <Text style={type.meta}>{it.meta}</Text>}
            {!!it.text && (
              <Text style={type.body} numberOfLines={3}>
                {it.text}
              </Text>
            )}
          </>
        );
        return (
          <Pressable
            key={it.id}
            accessibilityRole="button"
            disabled={!onPress}
            onPress={() => onPress?.(it.id)}
            style={({ pressed: p }) => [cards ? s.card : s.plain, { opacity: p ? pressed : 1 }]}
          >
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}

const DOT_OVERHANG = -(RAIL + 2);

const s = StyleSheet.create({
  wrap: { gap: space.s, position: 'relative' },
  line: { position: 'absolute', left: 5, width: size.line },
  card: {
    gap: space.xs,
    paddingVertical: space.m,
    paddingHorizontal: space.m + 2,
    borderRadius: radius.tile,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
    minHeight: size.tap,
  },
  plain: { gap: space.xs, paddingVertical: space.xs, marginBottom: space.s },
  plainTitle: { fontSize: 16 },
  dot: { position: 'absolute', left: DOT_OVERHANG, width: size.dot, height: size.dot, borderRadius: size.dot / 2 },
  split: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  grow: { flex: 1 },
  secondary: { color: colors.textSecondary },
});
