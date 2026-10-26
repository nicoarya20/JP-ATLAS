// First, before any gluestack component: the Atlas tailwind-merge config only reaches tva styles defined after it
// (src/theme/tw-merge.ts). Without it a Button label loses its colour to its text size.
import '@/theme/tw-merge';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { MODAL, NO_SWIPE, SHEET } from '@/navigation/stack-presentation';
import { UnreachableScreen } from '@/screens/auth/unreachable.screen';
import { useSessionGate } from '@/session';
import { FONT_FILES } from '@/theme/fonts';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

// A sheet or modal opened by a link (e.g. /create) still has the tabs under it to close back to.
export const unstable_settings = { anchor: '(tabs)' };

// Keep the splash up until Manrope is ready, so the first frame is not drawn in the system font.
SplashScreen.preventAutoHideAsync().catch((e) =>
  console.warn(`Splash keep-up failed: ${e.message}`),
);

/**
 * Root: Manrope, safe-area insets for Uniwind, gesture root, gluestack provider (follows the phone's scheme), and the
 * session gate.
 *
 * The gate is the reason the two halves of the app are wrapped in `Stack.Protected`: a screen whose guard is false is
 * never registered, so the tabs cannot draw a frame of someone else's data before being replaced. Until the session has
 * been read the splash stays up (`ready` waits for both the font and the session), and a session that could not be read
 * at all gets the retry screen instead of the sign-in screen, which would be a guess.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const gate = useSessionGate();
  const signedIn = gate.status === 'signed-in';
  const ready = (fontsLoaded || fontError !== null) && gate.status !== 'loading';

  useEffect(() => {
    // A failed font is not fatal: the app falls back to the system font, but say so instead of hiding it.
    if (fontError)
      console.warn(`Manrope failed to load, using the system font: ${fontError.message}`);
    if (ready)
      SplashScreen.hideAsync().catch((e) => console.warn(`Splash hide failed: ${e.message}`));
  }, [ready, fontError]);

  if (!ready) return null;
  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode="system">
          <StatusBar style="auto" />
          {gate.status === 'unreachable' ? (
            <UnreachableScreen
              message={gate.error?.message ?? ''}
              busy={gate.retrying}
              onRetry={gate.retry}
            />
          ) : (
            /* Screens over the tabs; their routes: docs/phase1-screens.md §3.1 */
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={signedIn} redirectTo="/login">
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="create" options={SHEET} />
                <Stack.Screen name="leave" options={SHEET} />
                <Stack.Screen name="tasks/new" options={MODAL} />
                <Stack.Screen name="tasks/csv" options={MODAL} />
                <Stack.Screen name="projects/new" options={MODAL} />
                <Stack.Screen name="events/new" options={MODAL} />
                <Stack.Screen name="profile" options={MODAL} />
              </Stack.Protected>
              <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="(auth)" options={NO_SWIPE} />
              </Stack.Protected>
            </Stack>
          )}
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
