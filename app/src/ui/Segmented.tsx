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
            <Text style={[type.tab, { color: on ? colors.onInk : colors.ink }]}>{o.label}</Text>
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
    borderRadius: radius.small,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  seg: { flex: 1, height: size.tap, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  segOn: { backgroundColor: colors.ink },
});
