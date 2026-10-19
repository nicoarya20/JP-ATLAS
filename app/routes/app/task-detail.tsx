import { Paper, Stack, Text, Title } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { requestClock } from '@server/task/task.clock';
import type { TaskDetail } from '@server/task/task.dto';
import { getTaskDetail } from '@server/task/task-detail.query';
import { useQuery } from '@tanstack/react-query';
import { data, useNavigate } from 'react-router';
import { TaskChecklist } from '~/components/tasks/TaskChecklist';
import { TaskHeader } from '~/components/tasks/TaskHeader';
import { TaskTimeline } from '~/components/tasks/TaskTimeline';
import { DETAIL_COPY, NOT_FOUND_TEXT } from '~/components/tasks/tasks.copy';
import { BackLink } from '~/components/ui/BackLink';
import { PageContainer } from '~/components/ui/PageContainer';
import { toJson } from '~/lib/loader-json';
import { taskBackPath } from '~/lib/task-back';
import { fetchTask, taskKeys } from '~/lib/tasks-api';
import type { Route } from './+types/task-detail';

const TASK_NUMBER = /^\d+$/;

export function meta({ loaderData }: Route.MetaArgs) {
  const task = loaderData?.task;
  return [
    {
      title: task
        ? `#${task.number} ${task.title} — Simple PM`
        : `${DETAIL_COPY.fallbackTitle} — Simple PM`,
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  // The page is addressed by task number only (KB-2); an id or junk answers the same 404 as a hidden task.
  if (!TASK_NUMBER.test(params.number)) throw data(NOT_FOUND_TEXT, { status: 404 });
  const clock = requestClock();
  const res = await getTaskDetail(toPrincipal(actor), params.number, clock);
  if (!res.ok) throw data(NOT_FOUND_TEXT, { status: 404 });
  return {
    task: toJson<TaskDetail>(res.task),
    // "Today" is the server's, so "terlambat" matches the labels the server computed.
    today: clock.today,
    back: taskBackPath(request.url, request.headers.get('referer')),
    viewerId: actor.user.id,
    loadedAt: Date.now(),
  };
}

/** Header, step buttons, description, steps and the comment-and-history stream of one task. */
export default function TaskDetailPage({ loaderData, params }: Route.ComponentProps) {
  const { today, back, loadedAt, viewerId } = loaderData;
  const navigate = useNavigate();
  // Every task write invalidates `taskKeys.all`, so this refetches after a step or a 409 conflict.
  const { data: task } = useQuery({
    queryKey: taskKeys.detail(params.number),
    queryFn: () => fetchTask(params.number),
    initialData: loaderData.task,
    initialDataUpdatedAt: loadedAt,
  });
  return (
    <PageContainer>
      <div>
        <BackLink fallback={back} label={DETAIL_COPY.back} />
      </div>
      {/* The task is gone after a delete: leave for the list it was opened from (the toast offers Urungkan). */}
      <TaskHeader task={task} today={today} afterDelete={() => navigate(back)} />
      <Stack gap="lg">
        <Paper withBorder p={{ base: 'sm', md: 'md' }} radius="md">
          <Stack gap="xs">
            <Title order={3}>{DETAIL_COPY.description}</Title>
            {task.description ? (
              // User text: keep line breaks, render as plain text (never HTML).
              <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {task.description}
              </Text>
            ) : (
              <Text c="dimmed">{DETAIL_COPY.noDescription}</Text>
            )}
          </Stack>
        </Paper>
        <TaskChecklist
          taskRef={params.number}
          checklist={task.checklist}
          canEdit={task.can.update === true}
        />
        <TaskTimeline
          taskRef={params.number}
          viewerId={viewerId}
          canComment={task.can.comment === true}
        />
      </Stack>
    </PageContainer>
  );
}
