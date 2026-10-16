/** "+ Tugas baru" of the Tugas page, or the same button turned off with the reason beside it (Q5). */
import { Button, Stack, Text } from '@mantine/core';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router';
import { PAGE_COPY } from './tasks.copy';

/** The new-task form (S2-11). */
export const NEW_TASK_PATH = '/app/tasks/new';

/** The task form with one project filled in (S2-11 reads `?proyek=`). */
export const newTaskInProject = (projectId: string) =>
  `${NEW_TASK_PATH}?proyek=${encodeURIComponent(projectId)}`;

const BLOCKED_ID = 'create-task-blocked';

/** `canCreate` comes from the server's `caps.createTask`; the page never compares a role. */
export function CreateTaskButton({ canCreate }: { canCreate: boolean }) {
  const icon = <FiPlus size="1.25em" aria-hidden />;
  if (canCreate) {
    return (
      <Button component={Link} to={NEW_TASK_PATH} leftSection={icon}>
        {PAGE_COPY.create}
      </Button>
    );
  }
  // The reason stays visible text, not a tooltip: a disabled button gets no hover or focus.
  return (
    <Stack gap={4} align="flex-end" maw={360}>
      <Button disabled leftSection={icon} aria-describedby={BLOCKED_ID}>
        {PAGE_COPY.create}
      </Button>
      <Text id={BLOCKED_ID} size="sm" c="dimmed" ta="right">
        {PAGE_COPY.createBlocked}
      </Text>
    </Stack>
  );
}
