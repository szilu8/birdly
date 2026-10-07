import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2/700Bold';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { GameProvider } from '../lib/game';
import { registerForPush } from '../lib/push';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  if (!isSupabaseConfigured) {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
    return <SetupNeeded />;
  }
  return (
    <AuthProvider>
      <RootNavigator fontsReady={fontsReady} />
    </AuthProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, loading } = useAuth();
  const userId = session?.user.id ?? null;
  const ready = fontsReady && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Bejelentkezés után push értesítések engedélyezése
  useEffect(() => {
    if (userId) registerForPush(userId).catch((e) => console.warn('Push regisztráció sikertelen', e));
  }, [userId]);

  if (!ready) return null;

  return (
    <GameProvider key={userId ?? 'guest'} userId={userId}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="send" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add-friend" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </GameProvider>
  );
}

function SetupNeeded() {
  return (
    <View style={setupStyles.wrap}>
      <Text style={setupStyles.title}>birdly</Text>
      <Text style={setupStyles.text}>
        Hiányzik a szerver beállítása. Hozd létre a mobile/.env fájlt a .env.example alapján (EXPO_PUBLIC_SUPABASE_URL és
        EXPO_PUBLIC_SUPABASE_KEY), majd indítsd újra az appot.
      </Text>
    </View>
  );
}

const setupStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.moss, padding: 28, justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '800', color: colors.orange, marginBottom: 12 },
  text: { fontSize: 16, color: colors.orangeSoft, lineHeight: 24 },
});
