/** Body of the "Ringkasan" tab: progress vs time, the overdue count and the highlighted tasks. */
import { Group, Paper, Stack, Text } from '@mantine/core';
import type { ElapsedResult } from '@server/metrics/project.metrics';
import type { ProjectDetail } from '@server/project/project.dto';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { ProgressVsTime } from './ProgressVsTime';
import { ProjectTaskHighlights } from './ProjectTaskHighlights';
import { SUMMARY_COPY } from './projects.copy';

type Props = {
  project: Pick<ProjectDetail, 'progress' | 'taskCounts'>;
  elapsed: ElapsedResult | null;
};

function OverdueCard({ overdue }: { overdue: number }) {
  const Icon = overdue > 0 ? FiAlertCircle : FiCheckCircle;
  return (
    <Paper withBorder p="md" radius="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Text c={overdue > 0 ? 'danger' : 'ok'} lh={1}>
          <Icon size="1.25em" aria-hidden />
        </Text>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600}>{`${SUMMARY_COPY.overdueTitle}: ${overdue}`}</Text>
          <Text size="sm" c="dimmed">
            {overdue > 0 ? SUMMARY_COPY.overdueSome(overdue) : SUMMARY_COPY.overdueNone}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

export function ProjectSummary({ project, elapsed }: Props) {
  return (
    <Stack gap="md">
      <ProgressVsTime progress={project.progress} elapsed={elapsed} />
      <OverdueCard overdue={project.taskCounts.overdue} />
      <ProjectTaskHighlights />
    </Stack>
  );
}
