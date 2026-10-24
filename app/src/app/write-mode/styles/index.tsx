import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { borderDashed, colors, layout, radius, size, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Header } from '@/ui/Header';
import { StyleCard } from '@/ui/StyleCard';

/** Every style Echo learned from your writing, plus a suggestion to merge two that read alike. */
export default function Styles() {
  const { styles, pieces, mergeSuggestion: m, mergeStyles, undoMerge, keepStylesSeparate } = useStore();
  const insets = useSafeAreaInsets();
  const total = styles.reduce((n, st) => n + st.pieceIds.length, 0);
  const first = m && (styles.find((st) => st.id === m.keepId) ?? null);
  const second = m && (styles.find((st) => st.id === m.mergeId) ?? m.removed ?? null);

  return (
    <View style={s.root}>
      <Header
        mode="write"
        back="Write"
        right={<Button label="+ Upload more" variant="secondary" onPress={() => router.push('/write-mode/upload')} style={s.upload} />}
      />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={type.h1}>Your writing styles</Text>
        <Text style={type.meta}>
          {pieces.length
            ? `Echo grouped ${total} pieces into ${styles.length} styles. Tap one to see what it learned.`
            : 'Upload your writing and Echo will group it into styles.'}
        </Text>

        {m?.status === 'open' && first && second && (
          <View style={s.merge}>
            <Text style={type.meta}>These two read alike</Text>
            <View style={s.pair}>
              <Chip section="styles" label={first.name} />
              <Text style={type.bodyStrong}>+</Text>
              <Chip section="styles" label={second.name} />
            </View>
            <Text style={type.bodyStrong}>{m.reason}</Text>
            <View style={s.pair}>
              <Button label="Merge" onPress={mergeStyles} style={s.btn} />
              <Button label="Keep separate" variant="secondary" onPress={keepStylesSeparate} style={s.btn} />
            </View>
          </View>
        )}
        {m?.status === 'merged' && first && (
          <Card fill={colors.styles.tint} style={s.merged}>
            <Text style={[type.bodyStrong, s.grow]}>
              Merged into {first.name} · {first.pieceIds.length} pieces
            </Text>
            <Button label="Undo" variant="secondary" onPress={undoMerge} style={s.btn} />
          </Card>
        )}

        {styles.map((st) => (
          <StyleCard
            key={st.id}
            name={st.name}
            meta={`${st.pieceIds.length} pieces`}
            detail={st.traits.join(' · ')}
            onPress={() => router.push(`/write-mode/styles/${st.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  upload: { height: size.tap, paddingHorizontal: space.m },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, gap: layout.cardGap },
  merge: { ...borderDashed, borderRadius: radius.card, backgroundColor: colors.card, padding: layout.cardPadding, gap: space.m },
  pair: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s },
  btn: { height: size.tap, paddingHorizontal: space.l },
  merged: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  grow: { flex: 1 },
});
