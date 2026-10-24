import { StyleSheet, Text, View } from 'react-native';
import { border, colors, space, type } from '../theme';

const TAG_RADIUS = 10;

/** Small bordered category label (LinkedIn, Blog, Story) on draft cards. */
export function DraftTag({ label }: { label: string }) {
  return (
    <View style={s.tag}>
      <Text style={type.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.s + 1,
    paddingVertical: 3,
    borderRadius: TAG_RADIUS,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
});
