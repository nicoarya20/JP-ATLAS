import { Stack } from 'expo-router';

import { useSession } from '@/session';

// Signing in starts here; the held screens are reached by status, never by a link.
export const unstable_settings = { anchor: 'login' };

/**
 * Sign-in stack: no way back to the app by swiping from Sign in (docs/phase1-screens.md §3.1).
 *
 * Which of the three screens exists depends on what the server said about the account, so none of
 * them can be opened by someone it does not apply to: an account awaiting approval only has the
 * waiting screen, a turned-down account only the denied screen, and everyone else the sign-in
 * screens. The account picker stays registered for the Google flow a built app will have; nothing
 * links to it while Google is switched off (src/screens/auth/auth-parts.tsx).
 */
export default function AuthStack() {
  const { status } = useSession();
  const held = status === 'pending' || status === 'rejected';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!held} redirectTo={status === 'rejected' ? '/denied' : '/pending'}>
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'pending'} redirectTo="/login">
        <Stack.Screen name="pending" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'rejected'} redirectTo="/login">
        <Stack.Screen name="denied" />
      </Stack.Protected>
    </Stack>
  );
}
