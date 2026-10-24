import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeLog } from '@/api';
import { clock } from '@/format';
import { newId, useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';

const BAR = 3;

/** WriteLog: a plain note editor. Capture adds a transcript block below what you typed. */
export default function WriteLog() {
  const { writeDraft, setWriteDraft, writeCaptures, resetWrite, logs, themes, addLog } = useStore();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const captured = writeCaptures.map((c) => c.text);
  const text = [writeDraft.trim(), ...captured].filter(Boolean).join('\n\n');

  const save = async () => {
    if (!text) return router.back();
    setBusy(true);
    try {
      const analysis = await analyzeLog(text, themes, logs);
      const id = newId('lg');
      addLog({
        id,
        createdAt: new Date().toISOString(),
        transcript: text,
        source: writeCaptures.length ? 'mixed' : 'typed',
        saved: false,
        seconds: writeCaptures.reduce((n, c) => n + c.seconds, 0) || undefined,
        ...analysis,
        title: title.trim() || analysis.title,
      });
      resetWrite();
      router.replace(`/log/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { paddingTop: insets.top + space.s }]}>
        <BackPill label="Back" />
        <Button label={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy || !text} style={s.save} />
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={type.meta}>New log · {date}</Text>
        <TextInput
          style={s.title}
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Title"
        />
        <TextInput
          style={[type.bodyLg, s.input]}
          value={writeDraft}
          onChangeText={setWriteDraft}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.placeholder}
          multiline
          autoFocus
          textAlignVertical="top"
          accessibilityLabel="Log text"
        />
        {writeCaptures.map((c, i) => (
          <View key={i} style={s.capture}>
            <View style={s.bar} />
            <View style={s.captureBody}>
              <Text style={[type.label, { color: colors.logs.line }]}>From capture · {clock(c.seconds)}</Text>
              <Text style={type.bodyLg}>{c.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
        <Text style={[type.meta, s.hint]}>Talk to add more. It goes below your text.</Text>
        <Button
          label="Capture"
          icon="mic"
          size="footer"
          onPress={() => router.push({ pathname: '/capture', params: { mode: 'append' } })}
          style={s.capBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.gutter, paddingBottom: space.s + 2 },
  save: { height: 44, paddingHorizontal: space.xl },
  body: { paddingHorizontal: layout.gutter + 2, paddingTop: space.xs, paddingBottom: space.xl, gap: space.m },
  title: { fontFamily: 'Archivo_800ExtraBold', fontSize: 26, letterSpacing: -0.52, color: colors.ink, padding: 0 },
  input: { padding: 0, minHeight: 96 },
  capture: { flexDirection: 'row', gap: space.m },
  bar: { width: BAR, borderRadius: 2, backgroundColor: colors.logs.line },
  captureBody: { flex: 1, gap: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: layout.gutter - 4,
    paddingTop: space.s + 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  hint: { flex: 1, lineHeight: 19 },
  capBtn: { paddingLeft: space.m + 2, paddingRight: space.l + 2 },
});
