import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, shadow, size, space, type } from '../theme';

type Props = { onType: () => void; onCapture: () => void; bottomInset: number };

const BAR_RADIUS = 32;
const SIDE = 12;
const BOTTOM = 10;

/** Floating docked bar: the only element with a shadow (design-system-doc.md §1). */
export function CaptureBar({ onType, onCapture, bottomInset }: Props) {
  return (
    <View style={[s.wrap, { bottom: bottomInset + BOTTOM }]} pointerEvents="box-none">
      <View style={s.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Type a log" onPress={onType} style={s.field}>
          <Text style={[type.bodyStrong, { color: colors.placeholder }]}>Type a log</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture"
          onPress={onCapture}
          style={({ pressed: p }) => [s.capture, { opacity: p ? pressed : 1 }]}
        >
          <Feather name="mic" size={size.icon} color={colors.onInk} />
          <Text style={[type.button, { color: colors.onInk }]}>Capture</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: SIDE, right: SIDE },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s - 2,
    paddingVertical: 5,
    paddingRight: 5,
    paddingLeft: space.xl,
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: BAR_RADIUS,
    ...shadow.float,
  },
  field: { flex: 1, height: size.btnFooter, justifyContent: 'center' },
  capture: {
    height: size.btnFooter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingLeft: space.m + 2,
    paddingRight: space.l + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
});
