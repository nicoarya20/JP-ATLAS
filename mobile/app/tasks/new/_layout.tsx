import { Stack } from 'expo-router';

import { SWAP_IN_PLACE } from '@/navigation/stack-presentation';

/** New task modal: Just write ✦ (index) and Fill form swap in place (router.replace), with no header and no slide. */
export default function NewTaskStack() {
  return <Stack screenOptions={SWAP_IN_PLACE} />;
}
