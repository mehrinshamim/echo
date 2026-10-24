import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shortDate } from '@/format';
import { localId, useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';

export default function Chats() {
  const { chats, upsertChat } = useStore();
  const insets = useSafeAreaInsets();

  const newChat = () => {
    const id = localId();
    upsertChat({ id, title: 'New chat', themeIds: [], logIds: [], updatedAt: new Date().toISOString(), messages: [], local: true });
    router.push(`/chats/${id}`);
  };

  return (
    <View style={s.root}>
      <Header title="Chats" back="Home" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <Button label="New chat" icon="plus" onPress={newChat} />
        {!chats.length && <Text style={type.body}>Ask your past self anything. Answers cite your logs.</Text>}
        {chats.map((c) => (
          <Card key={c.id} fill={colors.chats.fill} onPress={() => router.push(`/chats/${c.id}`)}>
            <Text style={type.bodyStrong}>{c.title}</Text>
            <Text style={type.meta}>
              {shortDate(c.updatedAt)} · {c.messages.length} {c.messages.length === 1 ? 'message' : 'messages'}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, gap: layout.cardGap },
});
