import { Stack } from 'expo-router';

/** Sign-in stack: no way back to the app by swiping from Sign in (docs/phase1-screens.md §3.1). */
export default function AuthStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="account" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="denied" />
    </Stack>
  );
}
