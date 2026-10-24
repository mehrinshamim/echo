import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import { Button } from '@/ui/Button';

export default function SignIn() {
  const { signIn } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}>
      <Text style={type.label}>echo</Text>
      <View style={s.middle}>
        <Text style={type.h1Lg}>Your logs stay yours.</Text>
        <Text style={type.body}>
          Sign in so your logs, themes and chats are saved to your account. Audio never leaves your phone, only the
          text you keep.
        </Text>
      </View>
      {/* Stub: becomes Supabase Google OAuth once the backend exists. */}
      <Button
        label="Continue with Google"
        variant="secondary"
        icon="log-in"
        onPress={() => {
          signIn();
          router.replace('/');
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.gutter, backgroundColor: colors.bg },
  middle: { flex: 1, justifyContent: 'center', gap: space.l },
});
