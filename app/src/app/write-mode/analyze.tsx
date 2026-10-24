import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeWriting } from '@/api';
import { useStore } from '@/store';
import { border, colors, layout, radius, space, type } from '@/theme';
import { Button } from '@/ui/Button';

const STEP_MS = 500;
const BAR_MIN = 12;
const BAR_HEIGHTS = [20, 37, 54, 31];
const MARK = 24;

/** Echo reads the new pieces and files them under styles; moves on to Styles when done. */
export default function Analyze() {
  const { pieces, styles, applyAnalysis } = useStore();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState(false);
  const count = pieces.filter((p) => !p.analyzed).length;
  const steps = [
    `Read ${count} new ${count === 1 ? 'piece' : 'pieces'}`,
    'Compared tone, length and structure',
    'Sorted into your styles',
    'Looked for styles that read alike',
  ];
  // Read once: applying the result marks every piece analyzed, which would change `count` mid-run.
  const input = useRef({ pieces, styles });

  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setStage(i + 1), STEP_MS * (i + 1)));
    let live = true;
    analyzeWriting(input.current.pieces, input.current.styles)
      .then((r) => {
        if (!live) return;
        applyAnalysis(r.styles, r.suggestion);
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
    <View style={[s.root, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}>
      <View style={s.bars}>
        {BAR_HEIGHTS.map((h, i) => (
          <View key={i} style={[s.bar, { height: stage > i ? h : BAR_MIN }]} />
        ))}
      </View>
      <Text style={type.h1}>Reading how{'\n'}you write</Text>
      <View style={s.steps}>
        {steps.map((label, i) => {
          const done = stage > i;
          return (
            <View key={label} style={s.stepRow}>
              <View style={[s.mark, done && s.markDone]}>
                <Text style={type.label}>{done ? '✓' : i + 1}</Text>
              </View>
              <Text style={done ? type.bodyStrong : [type.body, { color: colors.textSecondary }]}>{label}</Text>
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
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: layout.gutter, gap: space.xl },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s, height: 60 },
  bar: { width: 14, borderRadius: radius.pill, backgroundColor: colors.styles.fill, borderWidth: border.width, borderColor: border.color },
  steps: { gap: space.l },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 28 },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: { backgroundColor: colors.styles.fill },
});
