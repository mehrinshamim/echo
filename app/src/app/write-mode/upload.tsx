import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { errorText } from '@/client';
import { useStore } from '@/store';
import { border, borderDashed, colors, layout, radius, size, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Header } from '@/ui/Header';

type Source = 'paste' | 'file' | 'link';
const SOURCES: { key: Source; label: string; icon: string }[] = [
  { key: 'paste', label: 'Paste', icon: '¶' },
  { key: 'file', label: 'File', icon: '↑' },
  { key: 'link', label: 'Link', icon: '↗' },
];
const TITLE_CHARS = 40;
const TILE = 76;

/** Add past writing (posts, articles, threads) for Echo to learn your styles from. */
export default function Upload() {
  const { pieces, setPieces } = useStore();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<Source>('paste');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = pieces.filter((p) => !p.analyzed);

  const addPaste = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError('');
    try {
      const title = t.length > TITLE_CHARS ? `${t.slice(0, TITLE_CHARS)}…` : t;
      const created = await api.addPieces([{ text: t, title, label: 'Pasted' }]);
      setPieces((prev) => [...prev, ...created]);
      setText('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const addFile = async () => {
    if (busy) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/markdown'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;
      setBusy(true);
      setError('');
      const asset = result.assets[0];
      const content = await fetch(asset.uri).then((res) => res.text());
      const created = await api.addPieces([{ text: content, title: asset.name, label: asset.name }]);
      setPieces((prev) => [...prev, ...created]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const addLink = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.addPieces([{ text: url.trim(), title: url.trim(), label: 'Link' }]);
      setPieces((prev) => [...prev, ...created]);
      setUrl('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const removePiece = async (id: string) => {
    try {
      await api.deletePiece(id);
      setPieces((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <View style={s.root}>
      <Header mode="write" back="Write" label="Add your writing" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={type.body}>
          Add posts, articles or threads you've already written. Echo learns how you write, groups them by style, and
          uses them when you make a post.
        </Text>
        {!!error && <Text style={[type.meta, { color: colors.recording }]}>{error}</Text>}
        <View style={s.tiles}>
          {SOURCES.map((o) => {
            const on = o.key === source;
            return (
              <Pressable
                key={o.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSource(o.key)}
                style={[s.tile, on && s.tileOn]}
              >
                <Text style={[s.glyph, { color: on ? colors.onInk : colors.ink }]}>{o.icon}</Text>
                <Text style={[type.label, { color: on ? colors.onInk : colors.ink }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {source === 'paste' && (
          <View style={s.panel}>
            <TextInput
              style={[type.body, s.paste]}
              value={text}
              onChangeText={setText}
              placeholder="Paste a post, article or thread"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
            <Button label="Add" variant="secondary" size="sm" onPress={addPaste} disabled={!text.trim()} style={s.end} />
          </View>
        )}
        {source === 'file' && (
          <View style={s.drop}>
            <Text style={type.button}>Choose files</Text>
            <Text style={type.meta}>.docx, .pdf, .md or .txt · up to 20 at once</Text>
            <Button label="Browse" variant="secondary" size="sm" onPress={addFile} style={s.browse} />
          </View>
        )}
        {source === 'link' && (
          <View style={s.linkBlock}>
            <View style={s.linkRow}>
              <TextInput
                style={[type.tab, s.linkInput]}
                value={url}
                onChangeText={setUrl}
                placeholder="LinkedIn, Medium or blog URL"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Button
                label={busy ? 'Importing…' : 'Import'}
                size="footer"
                onPress={addLink}
                disabled={!url.trim() || busy}
                style={s.import}
              />
            </View>
            <Text style={type.meta}>A profile link imports your recent public posts.</Text>
          </View>
        )}

        <View style={s.addedHead}>
          <Text style={type.h2}>Added</Text>
          <Text style={type.meta}>{pending.length} pieces</Text>
        </View>
        {!pending.length && <Text style={type.body}>Nothing added yet.</Text>}
        {pending.length > 0 && (
          <View style={s.list}>
            {pending.map((p, i) => (
              <View key={p.id} style={[s.item, i < pending.length - 1 && s.divider]}>
                <View style={s.grow}>
                  <Text style={[type.bodyStrong, s.itemTitle]} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={type.meta}>{p.source}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.title}`} onPress={() => removePiece(p.id)} style={s.remove}>
                  <Text style={s.times}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + space.m }]}>
        <Button
          label={`Analyze ${pending.length} pieces`}
          size="footer"
          disabled={!pending.length}
          onPress={() => router.push('/write-mode/analyze')}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, paddingBottom: space.xl, gap: space.m + 2 },
  grow: { flex: 1, gap: 2 },
  tiles: { flexDirection: 'row', gap: space.s },
  tile: {
    flex: 1,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.small,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  tileOn: { backgroundColor: colors.ink },
  glyph: { fontFamily: 'Archivo_800ExtraBold', fontSize: 18 },
  panel: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    padding: space.m,
    gap: space.s + 2,
  },
  paste: { minHeight: 96, padding: space.xs },
  end: { alignSelf: 'flex-end' },
  drop: {
    ...borderDashed,
    borderRadius: radius.card,
    paddingVertical: 22,
    paddingHorizontal: space.l,
    alignItems: 'center',
    gap: space.s,
  },
  browse: { marginTop: space.xs },
  linkBlock: { gap: space.s },
  linkRow: { flexDirection: 'row', gap: space.s },
  linkInput: {
    flex: 1,
    height: size.btnSecondary,
    paddingHorizontal: space.l,
    borderRadius: 24,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
    fontFamily: 'Archivo_500Medium',
  },
  import: { height: size.btnSecondary, paddingHorizontal: space.l },
  addedHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xs },
  list: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s + 2, paddingLeft: 14, paddingRight: 6 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemTitle: { fontFamily: 'Archivo_700Bold', fontSize: 15, lineHeight: 20 },
  remove: { width: size.tap, height: size.tap, alignItems: 'center', justifyContent: 'center' },
  times: { fontFamily: 'Archivo_700Bold', fontSize: 20, color: colors.ink },
  footer: {
    paddingHorizontal: layout.gutter - 4,
    paddingTop: space.s + 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
