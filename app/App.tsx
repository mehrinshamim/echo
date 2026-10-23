import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  MODELS,
  ModelId,
  downloadModel,
  isModelDownloaded,
  loadModel,
  transcribe,
} from './src/transcribe';
import { ensureMicPermission, startRecording, stopRecording } from './src/recorder';

type Stats = { audioSec: number; transcribeSec: number };

export default function App() {
  const [model, setModel] = useState<ModelId>('tiny.en');
  const [ready, setReady] = useState<ModelId | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setError(null);
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const prepareModel = () =>
    run(isModelDownloaded(model) ? 'Loading model…' : 'Downloading model…', async () => {
      await downloadModel(model);
      await loadModel(model);
      setReady(model);
    });

  const toggleRecord = async () => {
    if (!recording) {
      if (!(await ensureMicPermission())) return setError('Microphone permission denied');
      setText('');
      setStats(null);
      startRecording();
      setRecording(true);
      return;
    }
    setRecording(false);
    run('Transcribing…', async () => {
      const { pcm, seconds } = await stopRecording();
      const res = await transcribe(pcm);
      setText(res.text || '(no speech detected)');
      setStats({ audioSec: seconds, transcribeSec: res.ms / 1000 });
    });
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <Text style={s.title}>Echo · transcription test</Text>

      <View style={s.row}>
        {(Object.keys(MODELS) as ModelId[]).map((id) => (
          <Pressable
            key={id}
            disabled={!!busy || recording}
            onPress={() => {
              setModel(id);
              setReady(null);
            }}
            style={[s.chip, model === id && s.chipOn]}
          >
            <Text style={model === id ? s.chipTextOn : s.chipText}>{MODELS[id].label}</Text>
          </Pressable>
        ))}
      </View>

      {ready !== model && (
        <Pressable style={s.btn} disabled={!!busy} onPress={prepareModel}>
          <Text style={s.btnText}>Download / load {model}</Text>
        </Pressable>
      )}

      {ready === model && (
        <Pressable
          style={[s.rec, recording && s.recOn]}
          disabled={!!busy}
          onPress={toggleRecord}
        >
          <Text style={s.recText}>{recording ? 'Stop' : 'Record'}</Text>
        </Pressable>
      )}

      {busy && (
        <View style={s.row}>
          <ActivityIndicator />
          <Text style={s.muted}> {busy}</Text>
        </View>
      )}
      {error && <Text style={s.error}>{error}</Text>}

      {stats && (
        <Text style={s.stats}>
          audio {stats.audioSec.toFixed(1)}s · transcribed in {stats.transcribeSec.toFixed(1)}s ·
          RTF {(stats.transcribeSec / stats.audioSec).toFixed(2)} (lower is faster, &lt;1 = faster
          than real time)
        </Text>
      )}
      <ScrollView style={s.box}>
        <Text style={s.transcript}>{text || 'Transcript will appear here.'}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingTop: 64, paddingHorizontal: 20, backgroundColor: '#faf8f5', gap: 14 },
  title: { fontSize: 20, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#bbb', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#2b6f6a', borderColor: '#2b6f6a' },
  chipText: { color: '#333' },
  chipTextOn: { color: '#fff' },
  btn: { backgroundColor: '#2b6f6a', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  rec: { backgroundColor: '#2b6f6a', height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  recOn: { backgroundColor: '#c0392b' },
  recText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  muted: { color: '#666' },
  error: { color: '#c0392b' },
  stats: { color: '#444', fontSize: 13 },
  box: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 24 },
  transcript: { fontSize: 16, lineHeight: 24 },
});
