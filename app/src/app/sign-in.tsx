import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { errorText } from '@/client';
import { useStore } from '@/store';
import { signInWithGoogle } from '@/supabase';
import { border, colors, radius, size, space, type } from '@/theme';
import { BackPill } from '@/ui/BackPill';

const SIDE = 22;
const BADGE = 26;
const TRUST = ['Only you can see your logs', 'Delete everything anytime'];

export default function SignIn() {
  const { reopenOnboarding } = useStore();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <View style={[s.root, { paddingTop: insets.top + space.m, paddingBottom: insets.bottom + SIDE }]}>
      <BackPill onPress={reopenOnboarding} />
      <Text style={s.title}>Sign in to keep your logs safe</Text>
      <Text style={type.bodyLg}>Your account backs up your logs and themes. Audio never leaves your phone.</Text>
      <View style={s.spacer} />
      <View style={s.trust}>
        {TRUST.map((t) => (
          <View key={t} style={s.trustRow}>
            <Feather name="check" size={size.icon} color={colors.ink} />
            <Text style={type.tab}>{t}</Text>
          </View>
        ))}
      </View>
      {!!err && <Text style={[type.meta, { color: colors.recording }]}>{err}</Text>}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setErr('');
          try {
            await signInWithGoogle();
            // Navigation is automatic: store.tsx auth listener sets user, _layout.tsx re-routes.
          } catch (e) {
            setErr(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
        style={({ pressed: p }) => [s.google, { opacity: p || busy ? 0.7 : 1 }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <View style={s.badge}>
            <Text style={type.tab}>G</Text>
          </View>
        )}
        <Text style={[type.button, s.googleText]}>{busy ? 'Opening browser…' : 'Continue with Google'}</Text>
      </Pressable>
      <Text style={[type.meta, s.terms]}>By continuing you agree to the Terms and Privacy Policy.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SIDE, backgroundColor: colors.bg, gap: 18 },
  title: { ...type.h1, fontSize: 34, lineHeight: 36, letterSpacing: -1, marginTop: space.xxxl + space.s },
  spacer: { flex: 1 },
  trust: { gap: space.s + 2 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: space.s + 2 },
  google: {
    height: size.btnLg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m,
    borderRadius: radius.pill,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: colors.card,
  },
  googleText: { fontSize: 17 },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: border.width,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terms: { textAlign: 'center' },
});
