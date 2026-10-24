import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { StoreProvider, useStore } from '@/store';
import { ensureModel } from '@/transcribe';
import { colors } from '@/theme';

function Routes() {
  const { ready, onboarded, user } = useStore();
  const signedIn = !!user;

  // Fetch/load the speech model in the background once signed in, so Capture is instant later.
  useEffect(() => {
    if (signedIn) ensureModel().catch((e) => console.warn('Model prepare failed', e));
  }, [signedIn]);

  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded && !signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="write" />
        <Stack.Screen name="log/[id]" />
        <Stack.Screen name="logs" />
        <Stack.Screen name="themes/index" />
        <Stack.Screen name="themes/[id]" />
        <Stack.Screen name="chats/index" />
        <Stack.Screen name="chats/[id]" />
        <Stack.Screen name="write-mode/index" />
        <Stack.Screen name="write-mode/upload" />
        <Stack.Screen name="write-mode/analyze" options={{ gestureEnabled: false }} />
        <Stack.Screen name="write-mode/styles/index" />
        <Stack.Screen name="write-mode/styles/[id]" />
        <Stack.Screen name="write-mode/chat" />
        <Stack.Screen name="write-mode/draft/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Routes />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
