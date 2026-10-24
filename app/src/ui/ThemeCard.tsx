import { StyleSheet, Text, View } from 'react-native';
import { colors, size, space, type } from '../theme';
import { Card } from './Card';

type Props = { name: string; meta: string; onPress: () => void };

const MIN_BODY = 64;

/** Theme card: white, radius 14, 6px pink strip on top. Used in Home's grid and the Themes list. */
export function ThemeCard({ name, meta, onPress }: Props) {
  return (
    <Card onPress={onPress} radius={14} style={s.card}>
      <View style={s.strip} />
      <View style={s.body}>
        <Text style={[type.bodyStrong, s.name]}>{name}</Text>
        <Text style={type.meta}>{meta}</Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { padding: 0 },
  strip: { height: size.themeStrip, backgroundColor: colors.themes.line },
  body: { minHeight: MIN_BODY, paddingTop: space.s + 2, paddingHorizontal: space.m, paddingBottom: space.m, gap: space.xs },
  name: { fontFamily: 'Archivo_700Bold', fontSize: 15, lineHeight: 18 },
});
