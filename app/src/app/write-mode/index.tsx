import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shortDate } from '@/format';
import { useStore } from '@/store';
import { border, colors, layout, radius, size, space, type } from '@/theme';
import type { Draft } from '@/types';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DraftTag } from '@/ui/DraftTag';
import { Header } from '@/ui/Header';
import { Segmented } from '@/ui/Segmented';
import { StyleCard } from '@/ui/StyleCard';

type Tab = 'drafts' | 'saved' | 'pub';
const TABS: { key: Tab; label: string }[] = [
  { key: 'drafts', label: 'Drafts' },
  { key: 'saved', label: 'Saved' },
  { key: 'pub', label: 'Published' },
];

const SQUARE = 10;

/** Write mode home: start a post, add writing, and find drafts, saved and published posts. */
export default function WriteHome() {
  const { drafts, styles, publishDraft } = useStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: Tab; n?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'drafts');
  // Save for later / Mark as published land here with ?tab=; follow it even if this screen stayed mounted.
  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab, params.n]);
  const styleName = (d: Draft) => styles.find((st) => st.id === d.styleId)?.name;
  const byStatus = (status: Draft['status']) => drafts.filter((d) => d.status === status);
  const open = (id: string) => router.push(`/write-mode/draft/${id}`);

  const published = byStatus('published').sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

  return (
    <View style={s.root}>
      <Header mode="write" title="Your posts" back="Echo" label="Write mode">
        <View style={s.actions}>
          <Button label="+ New post" variant="white" size="md" onPress={() => router.push('/write-mode/chat')} style={s.grow} />
          <Button
            label="Upload writing"
            variant="onInk"
            size="md"
            icon="upload"
            onPress={() => router.push('/write-mode/upload')}
            style={s.upload}
          />
        </View>
      </Header>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}>
        <View style={s.row}>
          <Text style={type.h2}>Your styles</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/write-mode/styles')} style={s.manage}>
            <Text style={type.tab}>Manage ›</Text>
          </Pressable>
        </View>
        {styles.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.styleRow} style={s.bleed}>
            {styles.map((st) => (
              <StyleCard
                key={st.id}
                compact
                name={st.name}
                meta={`${st.pieceIds.length} pieces`}
                onPress={() => router.push(`/write-mode/styles/${st.id}`)}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={type.body}>Upload your writing and Echo will learn your styles.</Text>
        )}

        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'drafts' && (
          <>
            {!byStatus('draft').length && <Text style={type.body}>No drafts yet.</Text>}
            {byStatus('draft').map((d) => (
              <Card key={d.id} onPress={() => open(d.id)} radius={radius.tile} style={s.card}>
                <View style={s.row}>
                  <DraftTag label={d.category} />
                  <Text style={type.meta}>
                    v{d.version} · {shortDate(d.createdAt)}
                  </Text>
                </View>
                <Text style={[type.bodyStrong, s.cardTitle]}>{d.title}</Text>
                <View style={s.styleLine}>
                  <View style={s.square} />
                  <Text style={type.meta}>
                    {styleName(d) ? `${styleName(d)} · ` : ''}
                    {d.logIds.length} {d.logIds.length === 1 ? 'log' : 'logs'}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === 'saved' && (
          <>
            <Text style={type.meta}>Finished, not posted yet.</Text>
            {!byStatus('saved').length && <Text style={type.body}>Nothing saved for later.</Text>}
            {byStatus('saved').map((d) => (
              <Card key={d.id} radius={radius.tile} style={s.savedCard}>
                <Pressable accessibilityRole="button" onPress={() => open(d.id)} style={s.card}>
                  <View style={s.row}>
                    <DraftTag label={d.category} />
                    <Text style={type.meta}>Saved {shortDate(d.savedAt ?? d.createdAt)}</Text>
                  </View>
                  <Text style={[type.bodyStrong, s.cardTitle]}>{d.title}</Text>
                </Pressable>
                <View style={s.buttons}>
                  <Button
                    label="Copy"
                    variant="secondary"
                    size="sm"
                    onPress={() => Clipboard.setStringAsync(d.text)}
                    style={s.grow}
                  />
                  <Button
                    label="Mark published"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      publishDraft(d.id, d.category === 'Blog' ? 'Blog' : 'LinkedIn');
                      setTab('pub');
                    }}
                    style={s.grow}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        {tab === 'pub' && (
          <View style={s.timeline}>
            <View style={s.line} />
            {!published.length && <Text style={type.body}>Nothing published yet.</Text>}
            {published.map((d) => (
              <View key={d.id}>
                <View style={s.dot} />
                <Card radius={radius.tile} style={s.pubCard}>
                  <View style={s.row}>
                    <DraftTag label={d.platform ?? d.category} />
                    <Text style={type.meta}>{d.publishedAt ? shortDate(d.publishedAt) : ''}</Text>
                  </View>
                  <Text style={[type.bodyStrong, s.cardTitle]}>{d.title}</Text>
                  <View style={s.links}>
                    <Pressable
                      accessibilityRole="link"
                      disabled={!d.url}
                      onPress={() => d.url && Linking.openURL(d.url)}
                      style={s.manage}
                    >
                      <Text style={[type.tab, s.underline, !d.url && s.dim]}>View post ↗</Text>
                    </Pressable>
                    <Text style={type.meta}>Added to your styles</Text>
                  </View>
                </Card>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  actions: { flexDirection: 'row', gap: space.s, paddingBottom: space.xs },
  grow: { flex: 1 },
  upload: { paddingHorizontal: space.l },
  content: { paddingHorizontal: layout.gutter, paddingTop: space.l, gap: space.l },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  manage: { minHeight: size.tap, justifyContent: 'center' },
  bleed: { marginHorizontal: -layout.gutter, marginTop: -6, flexGrow: 0 },
  styleRow: { gap: space.s + 2, paddingHorizontal: layout.gutter, paddingBottom: space.xs },
  card: { gap: 6, padding: 14 },
  savedCard: { gap: space.s + 2, padding: 14 },
  pubCard: { gap: 6, paddingVertical: space.m, paddingHorizontal: 14 },
  cardTitle: { fontFamily: 'Archivo_700Bold', lineHeight: 21 },
  styleLine: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  square: {
    width: SQUARE,
    height: SQUARE,
    borderRadius: 3,
    backgroundColor: colors.styles.fill,
    borderWidth: border.width,
    borderColor: border.color,
  },
  buttons: { flexDirection: 'row', gap: space.s },
  links: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  underline: { textDecorationLine: 'underline' },
  dim: { opacity: 0.4 },
  timeline: { paddingLeft: 22, gap: space.s },
  line: { position: 'absolute', left: 5, top: 0, bottom: 0, width: size.line, backgroundColor: colors.ink },
  dot: {
    position: 'absolute',
    left: -22,
    top: 18,
    width: size.dot,
    height: size.dot,
    borderRadius: size.dot / 2,
    backgroundColor: colors.ink,
  },
});
