import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, layout, pressed, radius, shadow, size, space, type } from '../theme';

type Props = { onType: () => void; onCapture: () => void; bottomInset: number };

/** Floating docked bar: the only element with a shadow (design-system-doc.md §1). */
export function CaptureBar({ onType, onCapture, bottomInset }: Props) {
  return (
    <View style={[s.wrap, { paddingBottom: bottomInset + space.m }]} pointerEvents="box-none">
      <View style={s.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Type a log" onPress={onType} style={s.field}>
          <Feather name="edit-3" size={size.icon} color={colors.placeholder} />
          <Text style={[type.body, { color: colors.placeholder }]}>Type a log…</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture"
          onPress={onCapture}
          style={({ pressed: p }) => [s.capture, { opacity: p ? pressed : 1 }]}
        >
          <Feather name="mic" size={size.iconBar} color={colors.onInk} />
          <Text style={[type.button, { color: colors.onInk }]}>Capture</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: layout.gutter },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    padding: space.s,
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.pill,
    ...shadow.float,
  },
  field: {
    flex: 1,
    height: size.btnPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingLeft: space.m,
  },
  capture: {
    height: size.btnPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
});
