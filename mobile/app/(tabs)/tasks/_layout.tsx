import { Stack } from 'expo-router';

import { SHEET } from '@/navigation/stack-presentation';

// A task opened from elsewhere (a Home row, a link) still has the task list under it to go back to.
export const unstable_settings = { anchor: 'index' };

/** Tasks tab stack; screens: docs/phase1-screens.md §3.2. */
export default function TasksStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="filter" options={SHEET} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/return" options={SHEET} />
      <Stack.Screen name="[id]/cancel" options={SHEET} />
      <Stack.Screen name="[id]/reopen" options={SHEET} />
    </Stack>
  );
}
