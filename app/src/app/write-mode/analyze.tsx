import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { useStore } from '@/store';
import { border, colors, layout, radius, space, type } from '@/theme';
import { Button } from '@/ui/Button';

const STEP_MS = 500;
const BAR_MIN = 12;
const BAR_HEIGHTS = [20, 37, 54, 31];
const MARK = 28;

/** Echo reads the new pieces and files them under styles; moves on to Styles when done. */
export default function Analyze() {
  const { pieces, setStyles, setMergeSuggestion, refresh } = useStore();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState(false);
  const [alike, setAlike] = useState<boolean | null>(null);
  const count = pieces.filter((p) => !p.analyzed).length;
  const steps = [
    `Read ${count} new ${count === 1 ? 'piece' : 'pieces'}`,
    'Compared tone, length and structure',
    'Sorted into your styles',
    alike === null ? 'Looking for styles that read alike' : alike ? 'Found 2 styles that read alike' : 'No styles read alike',
  ];

  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setStage(i + 1), STEP_MS * (i + 1)));
    let live = true;
    api
      .analyzeWriting()
      .then((r) => {
        if (!live) return;
        setStyles(r.styles);
        setMergeSuggestion(r.mergeSuggestion);
        setAlike(!!r.mergeSuggestion);
        refresh().catch(() => {});
        timers.push(setTimeout(() => router.replace('/write-mode/styles'), STEP_MS * (steps.length + 1)));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[s.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl }]}>
      <View style={s.bars}>
        {BAR_HEIGHTS.map((h, i) => (
          <View key={i} style={[s.bar, { height: stage > i ? h : BAR_MIN }]} />
        ))}
      </View>
      <Text style={s.title}>Reading how{'\n'}you write</Text>
      <View style={s.steps}>
        {steps.map((label, i) => {
          const done = stage > i;
          return (
            <View key={i} style={s.stepRow}>
              <View style={[s.mark, done && s.markDone]}>
                <Text style={type.tab}>{done ? '✓' : i + 1}</Text>
              </View>
              <Text style={[type.bodyStrong, { color: done ? colors.ink : colors.textSecondary }]}>{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={type.meta}>Your writing stays private. Echo only uses it to match your voice.</Text>
      {failed && (
        <>
          <Text style={type.bodyStrong}>Something went wrong reading your writing. Your pieces are still saved.</Text>
          <Button label="Back to upload" variant="secondary" onPress={() => router.back()} />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 22, gap: 22, justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 },
  bar: { width: 28, borderRadius: 8, backgroundColor: colors.styles.fill, borderWidth: border.width, borderColor: border.color },
  title: { ...type.h1, fontSize: 30, lineHeight: 32 },
  steps: { gap: space.m },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: { backgroundColor: colors.styles.fill },
});
