/** Task progress next to elapsed time, so a reader sees at a glance whether work keeps pace with the calendar. */
import { Group, Paper, Progress, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ElapsedResult, ProgressResult } from '@server/metrics/project.metrics';
import { FiCheckSquare, FiClock } from 'react-icons/fi';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { SUMMARY_COPY } from './projects.copy';

type Props = {
  progress: Pick<ProgressResult, 'done' | 'total'>;
  /** From server `elapsed()`; null without both a start and a due date. */
  elapsed: ElapsedResult | null;
};

function CardTitle({ icon: Icon, title }: { icon: typeof FiClock; title: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Icon size="1.25em" aria-hidden />
      <Text fw={600}>{title}</Text>
    </Group>
  );
}

function TimeBody({ elapsed }: { elapsed: ElapsedResult | null }) {
  if (!elapsed) {
    return (
      <Stack gap={4}>
        <Text size="xl" fw={600} aria-label={SUMMARY_COPY.timeUnknownHint}>
          {SUMMARY_COPY.timeUnknown}
        </Text>
        <Text size="sm" c="dimmed">
          {SUMMARY_COPY.timeUnknownHint}
        </Text>
      </Stack>
    );
  }
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {elapsed.overrun ? SUMMARY_COPY.timeOverrun : SUMMARY_COPY.timeUsed(elapsed.percent)}
      </Text>
      <Progress
        value={elapsed.percent}
        color={elapsed.overrun ? 'danger' : 'gray'}
        aria-label={SUMMARY_COPY.timeUsed(elapsed.percent)}
      />
      <Text size="xs" c="dimmed">
        {SUMMARY_COPY.timeHint}
      </Text>
    </Stack>
  );
}

export function ProgressVsTime({ progress, elapsed }: Props) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <CardTitle icon={FiCheckSquare} title={SUMMARY_COPY.progressTitle} />
          <ProgressBar done={progress.done} total={progress.total} />
          <Text size="xs" c="dimmed">
            {SUMMARY_COPY.progressHint}
          </Text>
        </Stack>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <CardTitle icon={FiClock} title={SUMMARY_COPY.timeTitle} />
          <TimeBody elapsed={elapsed} />
        </Stack>
      </Paper>
    </SimpleGrid>
  );
}
