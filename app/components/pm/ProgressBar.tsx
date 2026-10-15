import { Group, Progress, Stack, Text } from '@mantine/core';
import { progress } from '@server/metrics/project.metrics';
import { FiClock, FiInbox } from 'react-icons/fi';

export const NO_TASKS_LABEL = 'Belum ada tugas';
const PERCENT_FULL = 100;

type Props = {
  done: number;
  total: number;
  /** Share of the planned span already used (0-100); shows a second, thinner bar when given. */
  timePct?: number | null;
};

/**
 * Percent from the one rounding rule in `progress()` (never 100% before all tasks are done).
 * It takes task rows, so the counts are expanded into minimal rows instead of copying its logic.
 */
function percentOf(done: number, total: number): number | null {
  const safeDone = Math.min(Math.max(done, 0), total);
  const rows = Array.from({ length: total }, (_, i) => ({
    status: i < safeDone ? ('done' as const) : ('todo' as const),
    deletedAt: null,
  }));
  return progress(rows).percent;
}

/** Task progress bar with the number as text; no tasks reads "Belum ada tugas", never 0% (R05 §3.4 #17). */
export function ProgressBar({ done, total, timePct }: Props) {
  const percent = total > 0 ? percentOf(done, total) : null;
  if (percent === null) {
    return (
      <Group gap="xs" wrap="nowrap" c="dimmed">
        <FiInbox size="1.25em" aria-hidden />
        <Text size="sm">{NO_TASKS_LABEL}</Text>
      </Group>
    );
  }
  const time = timePct == null ? null : Math.round(Math.min(PERCENT_FULL, Math.max(0, timePct)));
  return (
    <Stack gap={4}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm" fw={600}>
          {`${percent}%`}
        </Text>
        <Text size="xs" c="dimmed">
          {`${done} dari ${total} tugas selesai`}
        </Text>
      </Group>
      <Progress value={percent} color="ok" aria-label={`Progres tugas ${percent}%`} />
      {time !== null && (
        <>
          <Progress value={time} color="gray" size="xs" aria-label={`Waktu terpakai ${time}%`} />
          <Group gap={4} wrap="nowrap" c="dimmed">
            <FiClock size="1.25em" aria-hidden />
            <Text size="xs">{`Waktu terpakai ${time}%`}</Text>
          </Group>
        </>
      )}
    </Stack>
  );
}
