import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, layout, size, space, type } from '../theme';

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

const GRABBER = { width: 40, height: 4 };
const SHEET_RADIUS = 24;

/** Modal sheet that slides up over a dimmed backdrop. */
export function BottomSheet({ visible, title, onClose, children }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[s.sheet, { paddingBottom: bottom + space.l }]}>
          <View style={s.grabber} />
          <View style={s.head}>
            <Text style={type.h2}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={s.close}>
              <Feather name="x" size={size.icon} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderWidth: border.width,
    borderBottomWidth: 0,
    borderColor: border.color,
    paddingHorizontal: layout.gutter,
    paddingTop: space.s + 2,
    gap: space.m,
  },
  grabber: { alignSelf: 'center', ...GRABBER, borderRadius: GRABBER.height / 2, backgroundColor: colors.ink },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.tap },
  close: { width: size.tap, height: size.tap, alignItems: 'flex-end', justifyContent: 'center' },
});
