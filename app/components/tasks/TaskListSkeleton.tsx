/** Grey placeholder rows while a task list loads, so the page keeps its height and shape instead of showing a lone spinner. */
import { Skeleton, Stack } from '@mantine/core';
import { LIST_COPY } from './tasks.copy';

const ROW_KEYS = ['a', 'b', 'c', 'd'] as const;

type Props = { rows?: number };

export function TaskListSkeleton({ rows = 3 }: Props) {
  return (
    <Stack gap="xs" role="status" aria-busy="true" aria-label={LIST_COPY.loading}>
      {ROW_KEYS.slice(0, rows).map((key) => (
        <Skeleton key={key} height="4.5rem" radius="md" />
      ))}
    </Stack>
  );
}
