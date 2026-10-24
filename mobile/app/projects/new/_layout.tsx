import { Stack } from 'expo-router';

/** New project modal: choose a way (index), then the form, the story → draft, or a template; no stack header. */
export default function NewProjectStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
