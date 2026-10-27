/** One "Progres" card: task progress next to elapsed time, so a reader sees whether work keeps pace with the calendar. */
import { Group, Paper, Progress, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/dates';
import type { ElapsedResult, ProgressResult } from '@server/metrics/project.metrics';
import { FiTrendingUp } from 'react-icons/fi';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { SUMMARY_COPY } from './projects.copy';
import { scheduleLine } from './summary/schedule-line';

type Props = {
  progress: Pick<ProgressResult, 'done' | 'total'>;
  /** From server `elapsed()`; null without both a start and a due date. */
  elapsed: ElapsedResult | null;
  startDate: string | null;
  dueDate: string | null;
  /** The server's today, so "sisa N hari" matches the condition. */
  today: IsoDate;
};

function TimeBody({ elapsed }: { elapsed: ElapsedResult | null }) {
  if (!elapsed) {
    return (
      <Stack gap={4}>
        <Group justify="space-between" gap="xs" wrap="wrap">
          <Text size="sm" fw={600}>
            {SUMMARY_COPY.timeLabel}
          </Text>
          <Text size="sm" fw={600} aria-label={SUMMARY_COPY.timeUnknownHint}>
            {SUMMARY_COPY.timeUnknown}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {SUMMARY_COPY.timeUnknownHint}
        </Text>
      </Stack>
    );
  }
  const shown = elapsed.overrun ? SUMMARY_COPY.timeOverrun : SUMMARY_COPY.timeUsed(elapsed.percent);
  return (
    <Stack gap={4}>
      <Group justify="space-between" gap="xs" wrap="wrap">
        <Text size="sm" fw={600}>
          {SUMMARY_COPY.timeLabel}
        </Text>
        <Text size="sm" fw={600} c={elapsed.overrun ? 'danger' : undefined}>
          {shown}
        </Text>
      </Group>
      <Progress
        value={elapsed.percent}
        color={elapsed.overrun ? 'danger' : 'gray'}
        aria-label={`${SUMMARY_COPY.timeLabel} ${shown}`}
      />
    </Stack>
  );
}

export function ProgressVsTime({ progress, elapsed, startDate, dueDate, today }: Props) {
  const dates = scheduleLine({ startDate, dueDate }, today);
  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <FiTrendingUp size="1.25em" aria-hidden />
          <Text fw={600}>{SUMMARY_COPY.progressTitle}</Text>
        </Group>
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {SUMMARY_COPY.tasksLabel}
          </Text>
          <ProgressBar done={progress.done} total={progress.total} />
        </Stack>
        <TimeBody elapsed={elapsed} />
        {dates && (
          <Text size="sm" c="dimmed">
            {dates}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
