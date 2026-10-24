import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeLog } from '@/api';
import { newId, useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Header } from '@/ui/Header';

/** WriteLog: a plain note editor. Capture appends a transcript below what you typed. */
export default function WriteLog() {
  const { writeDraft, setWriteDraft, logs, themes, addLog } = useStore();
  const insets = useSafeAreaInsets();
  const [usedVoice, setUsedVoice] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    const text = writeDraft.trim();
    if (!text) return router.back();
    setBusy(true);
    const analysis = await analyzeLog(text, themes, logs);
    const id = newId('lg');
    addLog({
      id,
      createdAt: new Date().toISOString(),
      transcript: text,
      source: usedVoice ? 'mixed' : 'typed',
      saved: false,
      ...analysis,
    });
    setWriteDraft('');
    router.replace(`/log/${id}`);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header back="Home" />
      <View style={s.body}>
        <Text style={type.meta}>New log</Text>
        <TextInput
          style={[type.body, s.input]}
          value={writeDraft}
          onChangeText={setWriteDraft}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.placeholder}
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </View>
      <View style={[s.actions, { paddingBottom: insets.bottom + space.m }]}>
        <Button
          label="Capture"
          icon="mic"
          variant="secondary"
          onPress={() => {
            setUsedVoice(true);
            router.push({ pathname: '/capture', params: { mode: 'append' } });
          }}
          style={s.flex}
        />
        <Button label={busy ? 'Saving…' : 'Done'} icon="check" disabled={busy || !writeDraft.trim()} onPress={done} style={s.flex} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: layout.gutter, gap: space.s },
  input: { flex: 1, paddingTop: 0 },
  actions: { flexDirection: 'row', gap: space.m, paddingHorizontal: layout.gutter, paddingTop: space.m },
  flex: { flex: 1 },
});
