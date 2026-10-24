import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { importLink } from '@/api';
import { newId, useStore } from '@/store';
import { borderDashed, colors, layout, radius, size, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';
import { Segmented } from '@/ui/Segmented';

type Source = 'paste' | 'file' | 'link';
const SOURCES: { key: Source; label: string }[] = [
  { key: 'paste', label: 'Paste' },
  { key: 'file', label: 'File' },
  { key: 'link', label: 'Link' },
];
const TITLE_CHARS = 40;
const PASTE_HEIGHT = 140;

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Add past writing (posts, articles, threads) for Echo to learn your styles from. */
export default function Upload() {
  const { pieces, addPieces, removePiece } = useStore();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<Source>('paste');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = pieces.filter((p) => !p.analyzed);

  const addPaste = () => {
    const t = text.trim();
    if (!t) return;
    const words = wordCount(t);
    const title = t.length > TITLE_CHARS ? `${t.slice(0, TITLE_CHARS)}…` : t;
    addPieces([{ id: newId('pc'), title, source: `Pasted · ${words} words`, words, analyzed: false }]);
    setText('');
  };

  // Files and links are stand-ins until the backend can read them.
  const addFile = () =>
    addPieces([{ id: newId('pc'), title: 'talk-notes.md', source: 'File · 640 words', words: 640, analyzed: false }]);

  const addLink = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    try {
      addPieces(await importLink(url.trim()));
      setUrl('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <Header mode="write" back="Write" title="Add your writing" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={type.body}>
          Add posts, articles or threads you've already written. Echo learns how you write, groups them by style, and
          uses them when you make a post.
        </Text>
        <Segmented options={SOURCES} value={source} onChange={setSource} />

        {source === 'paste' && (
          <Card style={s.gap}>
            <TextInput
              style={[type.body, s.paste]}
              value={text}
              onChangeText={setText}
              placeholder="Paste a post, article or thread"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
            <Button label="Add" variant="secondary" onPress={addPaste} disabled={!text.trim()} />
          </Card>
        )}
        {source === 'file' && (
          <View style={[s.drop, s.gap]}>
            <Feather name="upload" size={size.icon} color={colors.ink} />
            <Text style={type.bodyStrong}>Choose files</Text>
            <Text style={type.meta}>.docx, .pdf, .md or .txt · up to 20 at once</Text>
            <Button label="Browse" variant="secondary" onPress={addFile} />
          </View>
        )}
        {source === 'link' && (
          <Card style={s.gap}>
            <TextInput
              style={[type.body, s.input]}
              value={url}
              onChangeText={setUrl}
              placeholder="LinkedIn, Medium or blog URL"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Button label={busy ? 'Importing…' : 'Import'} variant="secondary" onPress={addLink} disabled={!url.trim() || busy} />
            <Text style={type.meta}>A profile link imports your recent public posts.</Text>
          </Card>
        )}

        <View style={s.row}>
          <Text style={type.h2}>Added</Text>
          <Text style={type.meta}>
            {pending.length} {pending.length === 1 ? 'piece' : 'pieces'}
          </Text>
        </View>
        {!pending.length && <Text style={type.body}>Nothing added yet.</Text>}
        {pending.map((p) => (
          <Card key={p.id} style={s.piece}>
            <View style={s.grow}>
              <Text style={type.bodyStrong} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={type.meta}>{p.source}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.title}`} onPress={() => removePiece(p.id)} style={s.remove}>
              <Feather name="x" size={size.icon} color={colors.ink} />
            </Pressable>
          </Card>
        ))}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
        <Button
          label={`Analyze ${pending.length} ${pending.length === 1 ? 'piece' : 'pieces'}`}
          disabled={!pending.length}
          onPress={() => router.push('/write-mode/analyze')}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, paddingBottom: space.xxl, gap: layout.cardGap },
  gap: { gap: space.m },
  grow: { flex: 1, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  paste: { minHeight: PASTE_HEIGHT, padding: 0 },
  input: { minHeight: size.tap, padding: 0 },
  drop: { ...borderDashed, borderRadius: radius.card, padding: layout.cardPadding, alignItems: 'center', backgroundColor: colors.card },
  piece: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  remove: { width: size.tap, height: size.tap, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.m,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
