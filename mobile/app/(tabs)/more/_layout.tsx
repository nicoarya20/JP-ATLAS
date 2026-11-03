import { Stack } from 'expo-router';

import { SHEET } from '@/navigation/stack-presentation';
import { useFreshMoreStack } from '@/navigation/use-fresh-more-stack';

/** More tab stack: the screens the More panel opens (docs/phase1-screens.md §3.2). Its index only redirects home. */
export default function MoreStack() {
  const fresh = useFreshMoreStack();
  return (
    <Stack screenOptions={{ headerShown: false }} screenListeners={fresh}>
      <Stack.Screen name="index" />
      <Stack.Screen name="inbox" />
      <Stack.Screen name="team/index" />
      <Stack.Screen name="team/[id]" />
      <Stack.Screen name="archive/index" />
      <Stack.Screen name="archive/[key]/delete" options={SHEET} />
      <Stack.Screen name="users" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/profile" />
    </Stack>
  );
}
