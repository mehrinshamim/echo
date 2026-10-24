import { StyleSheet, Text, View } from 'react-native';
import { colors, size, space, type } from '../theme';
import { Card } from './Card';

type Props = { name: string; meta: string; onPress: () => void };

export function ThemeCard({ name, meta, onPress }: Props) {
  return (
    <Card onPress={onPress} style={s.card}>
      <View style={s.strip} />
      <View style={s.body}>
        <Text style={type.h2}>{name}</Text>
        <Text style={type.meta}>{meta}</Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { padding: 0 },
  strip: { height: size.themeStrip, backgroundColor: colors.themes.fill },
  body: { padding: space.l, gap: space.xs },
});
