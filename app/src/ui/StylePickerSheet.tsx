import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { border, borderDashed, colors, radius, size, type } from '../theme';
import type { Style } from '../types';
import { BottomSheet } from './BottomSheet';

type Props = {
  visible: boolean;
  styles: Style[];
  /** Selected style id; undefined means "Let Echo choose". */
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  onClose: () => void;
};

const DOT = 22;
const DOT_ON = 10;

/** "Write it like…": pick a style, let Echo choose, or upload new writing. */
export function StylePickerSheet({ visible, styles, selectedId, onSelect, onClose }: Props) {
  const options = [
    ...styles.map((st) => ({ id: st.id as string | undefined, name: st.name, meta: `${st.pieceCount} pieces · ${st.where}` })),
    { id: undefined, name: 'Let Echo choose', meta: 'Picks the closest style to what you ask' },
  ];
  return (
    <BottomSheet visible={visible} title="Write it like…" onClose={onClose}>
      <View style={s.list}>
        {options.map((o, i) => {
          const on = o.id === selectedId;
          return (
            <Pressable
              key={o.id ?? 'auto'}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                onSelect(o.id);
                onClose();
              }}
              style={[s.row, on && s.rowOn, i < options.length - 1 && s.divider]}
            >
              <View style={s.dot}>{on && <View style={s.dotOn} />}</View>
              <View style={s.text}>
                <Text style={type.bodyStrong}>{o.name}</Text>
                <Text style={type.meta}>{o.meta}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onClose();
          router.push('/write-mode/upload');
        }}
        style={s.upload}
      >
        <Text style={type.tab}>+ Upload new writing</Text>
      </Pressable>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  list: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  upload: { ...borderDashed, height: size.btnSecondary, borderRadius: size.btnSecondary / 2, alignItems: 'center', justifyContent: 'center' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  rowOn: { backgroundColor: colors.styles.tint },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: border.width,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { width: DOT_ON, height: DOT_ON, borderRadius: DOT_ON / 2, backgroundColor: colors.ink },
  text: { flex: 1, gap: 2 },
});
