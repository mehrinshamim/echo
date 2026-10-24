import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { analyzeLog } from '@/api';
import { clock } from '@/format';
import { ensureMicPermission, pauseRecording, resumeRecording, startRecording, stopRecording } from '@/recorder';
import { newId, useStore } from '@/store';
import { border, colors, layout, radius, space, type } from '@/theme';
import { ensureModel, isModelReady, transcribe } from '@/transcribe';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

type Phase = 'preparing' | 'recording' | 'paused' | 'processing' | 'error';
const STEPS = ['Transcribing on your phone', 'Finding themes', 'Linking past logs'];
const MIN_SECONDS = 1;

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
      setStep(2);
      const id = newId('lg');
      addLog({ id, createdAt: new Date().toISOString(), transcript: text, source: 'voice', saved: false, ...analysis });
      router.replace(`/log/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const recording = phase === 'recording' || phase === 'paused';

  return (
    <View style={[s.root, { paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.xl }]}>
      {phase !== 'processing' && <BackPill label="Cancel" />}

      {phase === 'preparing' && (
        <View style={s.center}>
          <ActivityIndicator color={colors.ink} />
          <Text style={type.h2}>Preparing speech model…</Text>
          <Text style={[type.meta, s.centerText]}>First time only. The model downloads once (~142 MB) and then works offline.</Text>
        </View>
      )}

      {recording && (
        <>
          <View style={s.center}>
            <Text style={type.meta}>{append ? 'Adding to your log' : 'New log'}</Text>
            <View style={[s.orb, phase === 'paused' && s.orbPaused]}>
              <Feather name={phase === 'paused' ? 'pause' : 'mic'} size={40} color={phase === 'paused' ? colors.ink : colors.onInk} />
            </View>
            <Text style={type.h1}>{clock(sec)}</Text>
            <Text style={type.body}>{phase === 'paused' ? 'Paused' : 'Listening… say it the way you would tell a friend.'}</Text>
          </View>
          <View style={s.actions}>
            <Button
              label={phase === 'paused' ? 'Resume' : 'Pause'}
              icon={phase === 'paused' ? 'play' : 'pause'}
              variant="secondary"
              onPress={togglePause}
              style={s.flex}
            />
            <Button label="Done" icon="check" onPress={done} style={s.flex} />
          </View>
        </>
      )}

      {phase === 'processing' && (
        <View style={s.center}>
          <Text style={type.h1}>Listening back…</Text>
          <Card style={s.steps}>
            {(append ? STEPS.slice(0, 1) : STEPS).map((label, i) => (
              <View key={label} style={s.stepRow}>
                {i < step ? (
                  <Feather name="check" size={20} color={colors.ink} />
                ) : i === step ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <View style={s.stepDot} />
                )}
                <Text style={i <= step ? type.bodyStrong : [type.body, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </Card>
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

const ORB = 120;

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.gutter, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l },
  centerText: { textAlign: 'center' },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbPaused: { backgroundColor: colors.card, borderWidth: border.width, borderColor: border.color },
  actions: { flexDirection: 'row', gap: space.m },
  flex: { flex: 1 },
  steps: { alignSelf: 'stretch', gap: space.l },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 28 },
  stepDot: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: border.width, borderColor: colors.divider },
});
