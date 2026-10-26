// The Tasks module's screens opened from a project (phase1-screens.tasks.md §9): Project settings and the filter of the
// project's Tasks tab. Both read the project from the route param `id`.
import { useLocalSearchParams } from 'expo-router';

import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { TasksFilterPanel, TasksSettings } from '@/screens/tasks';

/** Project settings (task types, statuses) of the project in the route param `id`. */
export function ProjectSettingsScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TasksSettings projectId={id} role={role} />;
}

/** Filter sheet of the project's Tasks tab; its query is kept per project. */
export function ProjectTaskFilterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TasksFilterPanel scope={`project:${id}`} inProject />;
}
