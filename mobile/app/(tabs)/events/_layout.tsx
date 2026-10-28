import { Stack } from 'expo-router';

import { NO_SWIPE, SHEET } from '@/navigation/stack-presentation';

// An event opened from elsewhere (a Home row, a link) still has the event list under it to go back to.
export const unstable_settings = { anchor: 'index' };

/** Events tab stack; screens: docs/phase1-screens.md §3.2. */
export default function EventsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="filter" options={SHEET} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/results" />
      <Stack.Screen name="[id]/record" />
      <Stack.Screen name="[id]/recording" options={NO_SWIPE} />
      <Stack.Screen name="[id]/outcomes/[step]" />
      <Stack.Screen name="[id]/cancel" options={SHEET} />
    </Stack>
  );
}
