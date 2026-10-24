import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { FONT_FILES } from '@/theme/fonts';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

// Keep the splash up until Manrope is ready, so the first frame is not drawn in the system font.
SplashScreen.preventAutoHideAsync();

/** Root: Manrope, safe-area insets for Uniwind, gesture root, gluestack provider (follows the phone's scheme). */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    // A failed font is not fatal: the app falls back to the system font, but say so instead of hiding it.
    if (fontError)
      console.warn(`Manrope failed to load, using the system font: ${fontError.message}`);
    if (ready) SplashScreen.hideAsync();
  }, [ready, fontError]);

  if (!ready) return null;
  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode="system">
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
