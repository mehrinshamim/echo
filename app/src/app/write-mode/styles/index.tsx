import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { errorText } from '@/client';
import { useStore } from '@/store';
import { border, borderDashed, colors, layout, radius, size, space, type } from '@/theme';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';

/** Every style Echo learned from your writing, plus a suggestion to merge two that read alike. */
export default function Styles() {
  const { styles, pieces, mergeSuggestion: m, setStyles, setMergeSuggestion } = useStore();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = styles.reduce((n, st) => n + st.pieceCount, 0);
  const first = m && (styles.find((st) => st.id === m.keepId) ?? null);
  const second = m && (styles.find((st) => st.id === m.mergeId) ?? null);

  const doMerge = async () => {
    if (!m || busy) return;
    setBusy(true);
    setError('');
    try {
      const merged = await api.mergeStyles(m.keepId, m.mergeId);
      setStyles(styles.filter((s) => s.id !== m.mergeId).map((s) => (s.id === m.keepId ? merged : s)));
      setMergeSuggestion(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const keepSeparate = () => {
    setMergeSuggestion(null);
  };

  return (
    <View style={s.root}>
      <View style={[s.bar, { paddingTop: insets.top + space.s }]}>
        <BackPill label="Write" onInk />
        <Button label="+ Upload more" variant="onInk" size="sm" onPress={() => router.push('/write-mode/upload')} style={s.upload} />
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={type.h1}>Your writing styles</Text>
        <Text style={[type.bodyStrong, s.sub]}>
          {pieces.length || styles.length
            ? `Echo grouped ${total} pieces into ${styles.length} styles. Tap one to see what it learned.`
            : 'Upload your writing and Echo will group it into styles.'}
        </Text>
        {!!error && <Text style={[type.meta, { color: colors.recording }]}>{error}</Text>}

        {m?.status === 'open' && first && second && (
          <View style={s.merge}>
            <Text style={[type.label, s.sub]}>These two read alike</Text>
            <View style={s.pair}>
              <Chip section="styles" label={first.name} />
              <Text style={type.button}>+</Text>
              <Chip section="styles" label={second.name} />
            </View>
            <Text style={[type.bodyStrong, s.reason]}>{m.reason}</Text>
            <View style={s.buttons}>
              <Button label={busy ? 'Merging…' : 'Merge'} size="sm" disabled={busy} onPress={doMerge} style={s.btn} />
              <Button label="Keep separate" variant="secondary" size="sm" onPress={keepSeparate} style={s.btn} />
            </View>
          </View>
        )}

        {styles.map((st) => (
          <Pressable
            key={st.id}
            accessibilityRole="button"
            onPress={() => router.push(`/write-mode/styles/${st.id}`)}
            style={({ pressed }) => [s.card, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={s.strip} />
            <View style={s.cardBody}>
              <View style={s.cardHead}>
                <Text style={s.name}>{st.name}</Text>
                <Text style={type.meta}>{st.pieceCount} pieces</Text>
              </View>
              <Text style={[type.bodyStrong, s.traits]}>{st.traits.join(' · ')}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.m,
    backgroundColor: colors.ink,
  },
  upload: { height: size.tap },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, gap: 14 },
  sub: { color: colors.textSecondary },
  merge: { ...borderDashed, borderRadius: radius.card, backgroundColor: colors.card, padding: 14, gap: space.s + 2 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  reason: { lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: space.s },
  btn: { height: size.tap },
  merged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    backgroundColor: colors.ink,
    borderRadius: radius.tile,
    paddingVertical: 6,
    paddingLeft: space.l,
    paddingRight: 6,
  },
  mergedText: { flex: 1, color: colors.onInk, fontFamily: 'Archivo_600SemiBold' },
  undo: { height: size.tap, paddingHorizontal: space.m + 2, justifyContent: 'center' },
  undoText: { color: colors.onInk, textDecorationLine: 'underline' },
  card: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.tile,
    overflow: 'hidden',
  },
  strip: { height: size.themeStrip, backgroundColor: colors.styles.line },
  cardBody: { paddingTop: space.m, paddingHorizontal: 14, paddingBottom: 14, gap: space.s },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s + 2 },
  name: { fontFamily: 'Archivo_800ExtraBold', fontSize: 17, color: colors.ink, flexShrink: 1 },
  traits: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
});
