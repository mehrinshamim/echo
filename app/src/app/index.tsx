import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { noticed, weekSummary } from '@/api';
import { dayLabel } from '@/format';
import { useStore } from '@/store';
import { colors, layout, size, space, type } from '@/theme';
import { CaptureBar } from '@/ui/CaptureBar';
import { Card } from '@/ui/Card';
import { IconButton } from '@/ui/IconButton';
import { SectionTile } from '@/ui/SectionTile';
import { Timeline } from '@/ui/Timeline';

const CAPTURE_BAR_SPACE = 120;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { logs, themes, chats, dismissedNoticeFor, dismissNotice, setWriteDraft } = useStore();
  const insets = useSafeAreaInsets();
  const saved = useMemo(() => logs.filter((l) => l.saved), [logs]);
  const week = useMemo(() => weekSummary(saved, themes), [saved, themes]);
  const notice = useMemo(() => noticed(saved, themes), [saved, themes]);
  const showNotice = notice && notice.theme.id !== dismissedNoticeFor;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: CAPTURE_BAR_SPACE + insets.bottom }]}
      >
        <View style={s.top}>
          <Text style={type.h2}>echo</Text>
          <IconButton icon="pen-tool" label="Switch to write mode" onPress={() => router.push('/write-mode')} />
        </View>
        <Text style={type.h1}>{greeting()}</Text>

        {showNotice && (
          <Card fill={colors.themes.fill} onPress={() => router.push(`/themes/${notice.theme.id}`)}>
            <View style={s.noticeHead}>
              <Text style={type.label}>Echo noticed</Text>
              <Pressable
                accessibilityLabel="Dismiss"
                hitSlop={12}
                onPress={() => dismissNotice(notice.theme.id)}
              >
                <Feather name="x" size={size.icon} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={type.bodyStrong}>
              You came back to “{notice.theme.name}” {notice.count} times this week.
            </Text>
            <Text style={type.meta}>See how your thinking changed →</Text>
          </Card>
        )}

        <Card onPress={() => router.push('/logs')}>
          <Text style={type.label}>This week</Text>
          <Text style={type.h2}>
            {week.count} {week.count === 1 ? 'log' : 'logs'}
          </Text>
          <Text style={type.body}>{week.line}</Text>
        </Card>

        <View style={s.tiles}>
          <SectionTile section="logs" title="Logs" icon="list" count={saved.length} onPress={() => router.push('/logs')} />
          <SectionTile section="themes" title="Themes" icon="layers" count={themes.length} onPress={() => router.push('/themes')} />
          <SectionTile section="chats" title="Chats" icon="message-circle" count={chats.length} onPress={() => router.push('/chats')} />
        </View>

        {saved.length > 0 && (
          <View style={s.recent}>
            <Text style={type.h2}>Recent</Text>
            <Timeline
              section="logs"
              items={saved.slice(0, 3).map((l) => ({ id: l.id, date: dayLabel(l.createdAt), title: l.title }))}
              onPress={(id) => router.push(`/log/${id}`)}
            />
          </View>
        )}
      </ScrollView>

      <CaptureBar
        bottomInset={insets.bottom}
        onType={() => {
          setWriteDraft('');
          router.push('/write');
        }}
        onCapture={() => router.push('/capture')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, gap: layout.cardGap },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noticeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tiles: { flexDirection: 'row', gap: space.s },
  recent: { gap: space.m, marginTop: space.s },
});
