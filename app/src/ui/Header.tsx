import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, size, space, type } from '../theme';
import { BackPill } from './BackPill';

type Props = {
  title?: string;
  back?: string | false;
  onBack?: () => void;
  right?: ReactNode;
  /** Write mode: an ink bar marks the context switch. */
  mode?: 'journal' | 'write';
};

export function Header({ title, back = 'Back', onBack, right, mode = 'journal' }: Props) {
  const { top } = useSafeAreaInsets();
  const write = mode === 'write';
  return (
    <View style={[s.bar, { paddingTop: top + space.s }, write && s.write]}>
      <View style={s.row}>
        {back !== false ? <BackPill label={back} onPress={onBack} onInk={write} /> : <View />}
        {right}
      </View>
      {!!title && <Text style={[type.h1, write && { color: colors.onInk }]}>{title}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { paddingHorizontal: layout.gutter, paddingBottom: space.m, gap: space.m, backgroundColor: colors.bg },
  write: { backgroundColor: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.tap },
});
