/**
 * "Tugas yang perlu perhatian" card on the project summary (S2-14, lane L3b): at most five open
 * tasks, overdue first and then high or critical priority. Both come from the task API, so which
 * task is late is the server's call, never the browser's clock.
 */
import { Anchor, Center, Loader, Paper, Stack, Text } from '@mantine/core';
import { FiStar } from 'react-icons/fi';
import { Link, useParams } from 'react-router';
import { TaskRow } from '~/components/tasks/TaskRow';
import { PROJECT_TAB_COPY } from '~/components/tasks/tasks.copy';
import { EmptyState } from '~/components/ui/EmptyState';
import { taskErrorMessage } from '~/lib/tasks-api';
import { useProjectHighlights } from '~/lib/tasks-highlights';
import { SUMMARY_COPY } from './projects.copy';

function Highlights({ projectId }: { projectId: string }) {
  const highlights = useProjectHighlights(projectId);
  if (highlights.isError) {
    return (
      <Text size="sm" c="danger">
        {taskErrorMessage(highlights.error)}
      </Text>
    );
  }
  if (!highlights.data) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }
  if (highlights.data.length === 0) {
    return (
      <EmptyState
        icon={FiStar}
        title={SUMMARY_COPY.highlightsEmpty}
        description={SUMMARY_COPY.highlightsEmptyHint}
      />
    );
  }
  return (
    <Stack gap="xs" role="list">
      {highlights.data.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Stack>
  );
}

type Props = {
  /** Open tasks past their due date (server count); the card says it in one plain sentence. */
  overdue: number;
};

export function ProjectTaskHighlights({ overdue }: Props) {
  // The summary renders this card inside /app/projects/:projectId, so the route names the project.
  const { projectId = '' } = useParams();
  return (
    <Paper withBorder p="md">
      <Stack gap="xs">
        <Text fw={600}>{SUMMARY_COPY.highlightsTitle}</Text>
        <Text size="sm" c={overdue > 0 ? 'danger' : 'dimmed'}>
          {overdue > 0 ? SUMMARY_COPY.overdueSome(overdue) : SUMMARY_COPY.overdueNone}
        </Text>
        <Highlights projectId={projectId} />
        <Anchor component={Link} to={`/app/projects/${projectId}/tasks`} size="sm">
          {PROJECT_TAB_COPY.allTasks}
        </Anchor>
      </Stack>
    </Paper>
  );
}
