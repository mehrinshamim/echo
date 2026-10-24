import { Pressable, StyleSheet, Text, View } from 'react-native';
import { border, colors, radius, size, type } from '../theme';

type Props<K extends string> = { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void };

export function Segmented<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={s.bar} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[s.seg, on && s.segOn]}
          >
            <Text style={[type.label, { color: on ? colors.onInk : colors.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    padding: 3,
  },
  seg: { flex: 1, height: size.tap - 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
});
