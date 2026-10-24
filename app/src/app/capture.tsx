import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeLog } from '@/api';
import { clock } from '@/format';
import { ensureMicPermission, pauseRecording, resumeRecording, startRecording, stopRecording } from '@/recorder';
import { newId, useStore } from '@/store';
import { border, colors, radius, space, type } from '@/theme';
import { ensureModel, isModelReady, transcribe } from '@/transcribe';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';

type Phase = 'preparing' | 'recording' | 'paused' | 'processing' | 'error';
const STEPS = ['Transcribed on your phone', 'Summary and key points ready', 'Added to your themes', 'Looked for related logs'];
const MIN_SECONDS = 1;
const SIDE = 20;
const ORB_MIN = 170;
const ORB_MAX = 220;
const PULSE_MS = 700;
const PROC_ORB = 120;
const PROC_DOT = 30;
const PROC_DOT_STEP = 18;
const MARK = 26;

export default function Capture() {
  // mode=append: called from WriteLog; the transcript goes below the typed text instead of a new Result.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const append = mode === 'append';
  const { logs, themes, addLog, setWriteDraft } = useStore();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>(isModelReady() ? 'recording' : 'preparing');
  const [sec, setSec] = useState(0);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const live = useRef(false);
  const pulse = useRef(new Animated.Value(ORB_MIN)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await ensureMicPermission())) throw new Error('Microphone permission is needed to capture.');
        await ensureModel();
        if (cancelled) return;
        await startRecording();
        live.current = true;
        setPhase('recording');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
      if (live.current) stopRecording().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // The orb breathes while listening and rests when paused.
  useEffect(() => {
    if (phase !== 'recording') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: ORB_MAX, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: ORB_MIN, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const togglePause = () => {
    if (phase === 'recording') {
      pauseRecording();
      setPhase('paused');
    } else {
      resumeRecording();
      setPhase('recording');
    }
  };

  const done = async () => {
    setPhase('processing');
    try {
      live.current = false;
      const { pcm, seconds } = await stopRecording();
      if (seconds < MIN_SECONDS) throw new Error('That was too short. Speak for at least a second.');
      const { text } = await transcribe(pcm);
      if (!text) throw new Error('No speech detected. Try again a little closer to the mic.');
      if (append) {
        setWriteDraft((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text));
        router.back();
        return;
      }
      setStep(1);
      const analysis = await analyzeLog(text, themes, logs);
      setStep(STEPS.length);
      const id = newId('lg');
      addLog({ id, createdAt: new Date().toISOString(), transcript: text, source: 'voice', saved: false, ...analysis });
      router.replace(`/log/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const recording = phase === 'recording' || phase === 'paused';
  const steps = append ? STEPS.slice(0, 1) : STEPS;

  return (
    <View style={[s.root, { paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.l }]}>
      {(phase === 'preparing' || phase === 'error') && <BackPill label="Cancel" />}

      {phase === 'preparing' && (
        <View style={s.center}>
          <ActivityIndicator color={colors.ink} />
          <Text style={type.h2}>Preparing speech model…</Text>
          <Text style={[type.meta, s.centerText]}>First time only. The model downloads once (~142 MB) and then works offline.</Text>
        </View>
      )}

      {recording && (
        <>
          <View style={s.status}>
            <View style={s.state}>
              <View style={[s.dot, { backgroundColor: phase === 'paused' ? colors.textSecondary : colors.recording }]} />
              <Text style={type.tab}>{phase === 'paused' ? 'Paused' : 'Listening'}</Text>
            </View>
            <Text style={type.meta}>Transcribing on this phone</Text>
          </View>
          <View style={s.orbArea}>
            <Animated.View style={[s.orb, { width: pulse, height: pulse }]}>
              <Text style={s.timer}>{clock(sec).padStart(5, '0')}</Text>
            </Animated.View>
          </View>
          {append && <Text style={[type.label, { color: colors.logs.line }]}>Adding to your log</Text>}
          <View style={s.transcript}>
            <Text style={type.bodyLg}>
              {phase === 'paused' ? 'Paused. Tap Resume when you are ready.' : 'Say it the way you would tell a friend. Your words appear when you tap Done.'}
            </Text>
          </View>
          <View style={s.actions}>
            <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={s.cancel} />
            <Button label={phase === 'paused' ? 'Resume' : 'Pause'} variant="secondary" onPress={togglePause} style={s.flex} />
            <Button label="Done" onPress={done} style={s.doneBtn} />
          </View>
        </>
      )}

      {phase === 'processing' && (
        <View style={s.proc}>
          <View style={s.procOrb}>
            <View style={{ width: PROC_DOT + step * PROC_DOT_STEP, height: PROC_DOT + step * PROC_DOT_STEP, borderRadius: radius.pill, backgroundColor: colors.logs.line }} />
          </View>
          <Text style={s.procTitle}>Listening back…</Text>
          <View style={s.steps} accessibilityRole="progressbar">
            {steps.map((label, i) => {
              const finished = step > i;
              return (
                <View key={label} style={s.stepRow}>
                  <View style={[s.mark, finished && s.markDone]}>
                    <Text style={[type.label, { color: finished ? colors.onInk : colors.textSecondary }]}>{finished ? '✓' : i + 1}</Text>
                  </View>
                  <Text style={[type.bodyStrong, { fontSize: 17, color: finished ? colors.ink : colors.textSecondary }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {phase === 'error' && (
        <View style={s.center}>
          <Text style={type.h2}>Couldn't capture that</Text>
          <Text style={[type.body, s.centerText]}>{error}</Text>
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SIDE, backgroundColor: colors.bg, gap: space.l },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l },
  centerText: { textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  state: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  dot: { width: 10, height: 10, borderRadius: 5 },
  orbArea: { height: 230, alignItems: 'center', justifyContent: 'center' },
  orb: {
    borderRadius: radius.pill,
    backgroundColor: colors.logs.fill,
    borderWidth: border.width,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { fontFamily: 'Archivo_800ExtraBold', fontSize: 46, letterSpacing: -0.9, color: colors.ink },
  transcript: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.s + 2 },
  cancel: { height: 56, paddingHorizontal: space.l + 2 },
  doneBtn: { height: 56, paddingHorizontal: space.xl + 2 },
  flex: { flex: 1 },
  proc: { flex: 1, justifyContent: 'center', gap: space.xxl, padding: space.xl },
  procOrb: {
    width: PROC_ORB,
    height: PROC_ORB,
    borderRadius: radius.pill,
    backgroundColor: colors.logs.fill,
    borderWidth: border.width,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  procTitle: { ...type.h1, fontSize: 32, lineHeight: 34 },
  steps: { gap: space.m + 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
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
  markDone: { backgroundColor: colors.ink },
});
