import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { colors, layout, space, type } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

const STEPS = [
  { section: 'logs', title: 'Say it now', text: 'Capture a thought right after it happens. It is transcribed on your phone.' },
  { section: 'themes', title: 'See it grow', text: 'Logs group into themes, so you can see how your thinking changed.' },
  { section: 'chats', title: 'Find it later', text: 'Ask your past self. Answers cite the logs they came from.' },
] as const;

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}>
      <Text style={type.label}>echo</Text>
      <Text style={[type.h1Lg, s.title]}>Say it now.{'\n'}Find it later.</Text>
      <View style={s.steps}>
        {STEPS.map((st) => (
          <Card key={st.title} fill={colors[st.section].fill}>
            <Text style={type.bodyStrong}>{st.title}</Text>
            <Text style={type.body}>{st.text}</Text>
          </Card>
        ))}
      </View>
      <Button
        label="Get started"
        onPress={() => {
          completeOnboarding();
          router.replace('/sign-in');
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.gutter, backgroundColor: colors.bg },
  title: { marginTop: space.s },
  steps: { flex: 1, gap: layout.cardGap, marginTop: space.xxl },
});
