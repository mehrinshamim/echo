import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { colors, layout, radius, size, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';

const BULLET = 8;

/** What Echo learned about one style, and the pieces it came from. */
export default function StyleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { styles, pieces, renameStyle } = useStore();
  const insets = useSafeAreaInsets();
  const style = styles.find((st) => st.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(style?.name ?? '');

  if (!style) {
    return (
      <View style={s.root}>
        <Header mode="write" back="Styles" />
        <Text style={[type.body, s.pad]}>This style no longer exists.</Text>
      </View>
    );
  }

  const mine = pieces.filter((p) => style.pieceIds.includes(p.id));
  const save = () => {
    if (name.trim()) renameStyle(style.id, name.trim());
    setEditing(false);
  };

  return (
    <View style={s.root}>
      <Header
        mode="write"
        back="Styles"
        right={
          <Button
            label="Write in this style"
            variant="secondary"
            onPress={() => router.push({ pathname: '/write-mode/chat', params: { styleId: style.id } })}
            style={s.write}
          />
        }
      />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <View style={s.head}>
          {editing ? (
            <TextInput style={[type.h1, s.grow]} value={name} onChangeText={setName} onSubmitEditing={save} autoFocus />
          ) : (
            <Text style={[type.h1, s.grow]}>{style.name}</Text>
          )}
          <Button
            label={editing ? 'Save' : 'Rename'}
            variant="secondary"
            onPress={editing ? save : () => setEditing(true)}
            style={s.small}
          />
        </View>
        <Text style={type.meta}>
          {style.pieceIds.length} pieces · {style.where}
        </Text>

        <Card style={s.gap}>
          <Text style={type.meta}>How you write here</Text>
          {style.traits.map((t) => (
            <View key={t} style={s.trait}>
              <View style={s.bullet} />
              <Text style={[type.bodyStrong, s.grow]}>{t}</Text>
            </View>
          ))}
        </Card>

        <Card style={s.gap}>
          <Text style={type.meta}>Sounds like</Text>
          <Text style={type.bodyStrong}>“{style.sample}”</Text>
        </Card>

        <Text style={type.h2}>Pieces</Text>
        {mine.map((p) => (
          <Card key={p.id} style={s.gap}>
            <Text style={type.bodyStrong}>{p.title}</Text>
            <Text style={type.meta}>{p.source}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: layout.gutter, paddingTop: space.l },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, gap: layout.cardGap },
  write: { height: size.tap, paddingHorizontal: space.m },
  small: { height: size.tap, paddingHorizontal: space.m },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  grow: { flex: 1 },
  gap: { gap: space.s },
  trait: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  bullet: {
    width: BULLET,
    height: BULLET,
    borderRadius: radius.pill,
    backgroundColor: colors.styles.line,
  },
});
