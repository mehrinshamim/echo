import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { isThisWeek, noticed, weekSummary } from '@/api';
import { ago, fullDate } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import { CaptureBar } from '@/ui/CaptureBar';
import { NavList } from '@/ui/NavList';
import { ThemeCard } from '@/ui/ThemeCard';
import { Timeline } from '@/ui/Timeline';

const CAPTURE_BAR_SPACE = 100;
const AVATAR = 46;
const THEME_LIMIT = 6;
const GRID_GAP = 10;

export default function Home() {
  const { user, logs, themes, chats, dismissedNoticeFor, dismissNotice, resetWrite } = useStore();
  const insets = useSafeAreaInsets();
  const saved = useMemo(() => logs.filter((l) => l.saved), [logs]);
  const week = useMemo(() => weekSummary(saved, themes), [saved, themes]);
  const notice = useMemo(() => noticed(saved, themes), [saved, themes]);
  const showNotice = notice && notice.theme.id !== dismissedNoticeFor;

  const themeCards = useMemo(
    () =>
      themes
        .map((t) => {
          const own = saved.filter((l) => l.themeIds.includes(t.id));
          return { theme: t, count: own.length, last: own.map((l) => l.createdAt).sort().pop() };
        })
        .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''))
        .slice(0, THEME_LIMIT),
    [themes, saved],
  );

  const weekLines = useMemo(() => {
    const recent = saved.filter((l) => isThisWeek(l.createdAt)).slice(0, 2);
    return recent.length
      ? recent.map((l) => ({ id: l.id, title: l.keyPoints[0] ?? l.title }))
      : [{ id: 'none', title: week.line }];
  }, [saved, week.line]);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: CAPTURE_BAR_SPACE + insets.bottom + space.xl }]}
      >
        <View style={s.top}>
          <View style={s.avatar}>
            <Text style={type.h2}>{user?.name?.[0]?.toUpperCase() ?? 'E'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to write mode"
            onPress={() => router.push('/write-mode')}
            style={s.write}
          >
            <Feather name="edit-2" size={18} color={colors.ink} />
            <Text style={type.tab}>Write</Text>
          </Pressable>
        </View>
        <Text style={[type.tab, s.date]}>{fullDate()}</Text>

        {showNotice && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/themes/${notice.theme.id}`)}
            style={s.notice}
          >
            <View style={s.noticeHead}>
              <Text style={type.label}>Echo noticed · {notice.theme.name}</Text>
              <Pressable accessibilityLabel="Dismiss" onPress={() => dismissNotice(notice.theme.id)} style={s.dismiss}>
                <Feather name="x" size={size.icon} color={colors.ink} />
              </Pressable>
            </View>
            <View style={s.noticeBody}>
              <Text style={type.bodyStrong}>You've come back to this {notice.count} times this week.</Text>
              <Text style={[type.tab, s.link]}>See how it changed</Text>
            </View>
          </Pressable>
        )}

        <NavList
          rows={[
            { section: 'logs', title: 'Logs', icon: 'list', count: saved.length, onPress: () => router.push('/logs') },
            { section: 'themes', title: 'Themes', icon: 'folder', count: themes.length, onPress: () => router.push('/themes') },
            { section: 'chats', title: 'Chats', icon: 'message-square', count: chats.length, onPress: () => router.push('/chats') },
          ]}
        />

        {themeCards.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={type.h2}>Your themes</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/themes')} style={s.viewAll}>
                <Text style={type.tab}>View all {themes.length} →</Text>
              </Pressable>
            </View>
            <View style={s.grid}>
              {themeCards.map(({ theme, count, last }) => (
                <View key={theme.id} style={s.cell}>
                  <ThemeCard
                    name={theme.name}
                    meta={`${count} ${count === 1 ? 'log' : 'logs'}${last ? ` · ${ago(last)}` : ''}`}
                    onPress={() => router.push(`/themes/${theme.id}`)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.section}>
          <Text style={type.h2}>This week, in your words</Text>
          <Timeline
            section="logs"
            variant="plain"
            items={weekLines}
            onPress={(id) => id !== 'none' && router.push(`/log/${id}`)}
          />
        </View>
      </ScrollView>

      <CaptureBar
        bottomInset={insets.bottom}
        onType={() => {
          resetWrite();
          router.push('/write');
        }}
        onCapture={() => router.push('/capture')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.gutter, gap: space.xl },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  write: {
    height: AVATAR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  date: { color: colors.textSecondary, fontFamily: 'Archivo_600SemiBold', marginBottom: -space.s },
  notice: {
    backgroundColor: colors.card,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  noticeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.l,
    paddingVertical: space.xs,
    backgroundColor: colors.themes.fill,
    borderBottomWidth: border.width,
    borderBottomColor: border.color,
  },
  dismiss: { width: size.tap, height: size.tap, alignItems: 'center', justifyContent: 'center' },
  noticeBody: { padding: space.l, paddingTop: space.m + 2, gap: space.m - 2 },
  link: { textDecorationLine: 'underline' },
  section: { gap: space.m - 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: { minHeight: size.tap, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
