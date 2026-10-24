import { Stack } from 'expo-router';

/** Profile modal stack: the profile, then My calendar pushed inside the modal. */
export default function ProfileStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="calendar" />
    </Stack>
  );
}
