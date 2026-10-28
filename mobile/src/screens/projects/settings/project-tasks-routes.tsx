// The Tasks module's screen opened from a project (phase1-screens.tasks.md §9): the filter of the project's Tasks tab,
// which reads the project from the route param `id`.
import { useLocalSearchParams } from 'expo-router';

import { TasksFilterPanel } from '@/screens/tasks';

/** Filter sheet of the project's Tasks tab; its query is kept per project. */
export function ProjectTaskFilterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TasksFilterPanel scope={`project:${id}`} inProject />;
}
