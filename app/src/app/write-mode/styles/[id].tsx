import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/api';
import { errorText } from '@/client';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { StyleDetail as StyleDetailType } from '@/types';
import { BackPill } from '@/ui/BackPill';
import { Button } from '@/ui/Button';

const BAR = 3;

/** What Echo learned about one style, and the pieces it came from. */
export default function StyleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { styles, setStyles } = useStore();
  const insets = useSafeAreaInsets();
  const style = styles.find((st) => st.id === id);
  const [detail, setDetail] = useState<StyleDetailType | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(style?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .styleDetail(id)
      .then((d) => {
        setDetail(d);
        setName(d.name);
      })
      .catch((e) => setError(errorText(e)));
  }, [id]);

  const bar = (
    <View style={[s.bar, { paddingTop: insets.top + space.s }]}>
      <BackPill label="Styles" onInk />
      {style && (
        <Button
          label="Write in this style"
          variant="onInk"
          size="sm"
          onPress={() => router.push({ pathname: '/write-mode/chat', params: { styleId: style.id } })}
          style={s.write}
        />
      )}
    </View>
  );

  if (!style) {
    return (
      <View style={s.root}>
        {bar}
        <Text style={[type.body, s.pad]}>This style no longer exists.</Text>
      </View>
    );
  }

  const mine = detail?.pieces ?? [];
  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.renameStyle(style.id, name.trim());
      setDetail(updated);
      setStyles(styles.map((s) => (s.id === style.id ? updated : s)));
      setEditing(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      {bar}
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View style={s.head}>
            {editing ? (
              <TextInput style={[s.title, s.grow]} value={name} onChangeText={setName} onSubmitEditing={save} autoFocus />
            ) : (
              <Text style={[s.title, s.grow]}>{style.name}</Text>
            )}
            <Button
              label={editing ? 'Save' : 'Rename'}
              variant="secondary"
              size="xs"
              onPress={editing ? save : () => setEditing(true)}
              style={s.small}
            />
          </View>
          <Text style={[type.tab, s.heroMeta]}>
            {detail?.pieces.length ?? style.pieceCount} pieces · {style.where}
          </Text>
        </View>
        {!!error && <Text style={[type.meta, { color: colors.recording }]}>{error}</Text>}

        <View style={s.block}>
          <Text style={[type.h2, s.h3]}>How you write here</Text>
          {style.traits.map((t) => (
            <View key={t} style={s.trait}>
              <View style={s.bullet} />
              <Text style={[type.bodyStrong, s.grow]}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={s.sample}>
          <Text style={[type.label, s.secondary]}>Sounds like</Text>
          <Text style={[type.bodyStrong, s.quote]}>“{style.sample}”</Text>
        </View>

        <Text style={[type.h2, s.h3]}>Pieces</Text>
        <View style={s.list}>
          {mine.map((p, i) => (
            <View key={p.id} style={[s.item, i < mine.length - 1 && s.divider]}>
              <Text style={[type.bodyStrong, s.itemTitle]}>{p.title}</Text>
              <Text style={type.meta}>{p.source}</Text>
            </View>
          ))}
        </View>
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
  write: { height: size.tap },
  pad: { paddingHorizontal: layout.gutter, paddingTop: space.l },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, gap: space.l },
  grow: { flex: 1 },
  secondary: { color: colors.textSecondary },
  hero: {
    backgroundColor: colors.styles.fill,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    padding: space.l,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s },
  title: { ...type.h1, fontSize: 26, lineHeight: 27, padding: 0 },
  heroMeta: { fontFamily: 'Archivo_600SemiBold' },
  small: { paddingHorizontal: space.m },
  block: { gap: space.s + 2 },
  h3: { fontSize: 17 },
  trait: { flexDirection: 'row', gap: space.m },
  bullet: { width: BAR, borderRadius: 2, backgroundColor: colors.styles.line },
  sample: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  quote: { lineHeight: 24 },
  list: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  item: { paddingVertical: space.s + 2, paddingHorizontal: 14, gap: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemTitle: { fontFamily: 'Archivo_700Bold', fontSize: 15, lineHeight: 20 },
});
