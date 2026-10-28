import { Stack } from 'expo-router';

/** New project modal: the index opens the form; no stack header. */
export default function NewProjectStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
