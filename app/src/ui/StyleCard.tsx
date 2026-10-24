import { StyleSheet, Text, View } from 'react-native';
import { colors, size, space, type } from '../theme';
import { Card } from './Card';

type Props = {
  name: string;
  meta: string;
  onPress: () => void;
  /** Fixed-width card for the horizontal row on Write home; otherwise it fills its parent. */
  compact?: boolean;
  /** Optional extra line, e.g. the traits on the Styles screen. */
  detail?: string;
};

const COMPACT_WIDTH = 148;

/** A Theme-card-shaped card with the Styles strip on top. */
export function StyleCard({ name, meta, onPress, compact, detail }: Props) {
  return (
    <Card onPress={onPress} style={compact ? { ...s.card, width: COMPACT_WIDTH } : s.card}>
      <View style={s.strip} />
      <View style={s.body}>
        <Text style={compact ? type.bodyStrong : type.h2}>{name}</Text>
        <Text style={type.meta}>{meta}</Text>
        {!!detail && <Text style={type.body}>{detail}</Text>}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { padding: 0 },
  strip: { height: size.themeStrip, backgroundColor: colors.styles.line },
  body: { padding: space.m, gap: space.xs },
});
