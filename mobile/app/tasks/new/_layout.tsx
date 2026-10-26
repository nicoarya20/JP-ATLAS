import { Stack } from 'expo-router';

/** New task modal: Just write ✦ (index) and Fill form swap in place (router.replace), so the stack shows no header. */
export default function NewTaskStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
