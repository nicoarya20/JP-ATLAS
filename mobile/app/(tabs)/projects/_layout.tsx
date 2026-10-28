import { Stack } from 'expo-router';

import { SHEET } from '@/navigation/stack-presentation';

// A project opened from elsewhere (a Home row, a link) still has the project list under it to go back to.
export const unstable_settings = { anchor: 'index' };

/** Projects tab stack; screens: docs/phase1-screens.md §3.2. */
export default function ProjectsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="filter" options={SHEET} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/extend" options={SHEET} />
      <Stack.Screen name="[id]/archive" options={SHEET} />
      <Stack.Screen name="[id]/task-filter" options={SHEET} />
    </Stack>
  );
}
