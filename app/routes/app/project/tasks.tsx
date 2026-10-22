import { Button, Group, Stack, Title } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { getProjectDetail, listProjectMembers } from '@server/project/project.query';
import { requestClock } from '@server/task/task.clock';
import { listTasks } from '@server/task/task.query';
import { FiPlus } from 'react-icons/fi';
import { data, Link } from 'react-router';
import { NOT_FOUND_TEXT } from '~/components/projects/projects.copy';
import { newTaskInProject } from '~/components/tasks/CreateTaskButton';
import { TaskFilters } from '~/components/tasks/TaskFilters';
import { type TaskListSeed, TaskListView } from '~/components/tasks/TaskListView';
import { PROJECT_TAB_COPY } from '~/components/tasks/tasks.copy';
import { toJson } from '~/lib/loader-json';
import type { TaskPage } from '~/lib/tasks-api';
import { parseTaskFilters, TASK_NARROWING_PARAMS, toTaskQuery } from '~/lib/tasks-filters';
import { useUrlFilters } from '~/lib/use-url-filters';
import type { Route } from './+types/tasks';

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Tugas ${loaderData?.projectName ?? 'Proyek'} — Simple PM` }];
}

// Loads and checks access itself: the layout loader runs in parallel and does not protect this one.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const clock = requestClock();
  const projectId = params.projectId;
  const project = await getProjectDetail(principal, projectId, clock.now);
  if (!project) throw data(NOT_FOUND_TEXT, { status: 404 });
  const filters = parseTaskFilters(new URL(request.url).searchParams);
  const query = toTaskQuery(filters, { viewerId: actor.user.id, lockedProjectId: projectId });
  const [page, members] = await Promise.all([
    listTasks(principal, query, clock),
    listProjectMembers(principal, projectId),
  ]);
  const first: TaskPage = page.ok ? page : { items: [], nextCursor: null, caps: {} };
  const seed: TaskListSeed = {
    query,
    first: toJson<TaskPage>(first),
    counts: null,
    loadedAt: Date.now(),
  };
  return {
    seed,
    projectId,
    projectName: project.name,
    viewerId: actor.user.id,
    // From the server's caps: a Pemantau or a non-member PM gets no button (P3 §2 Proyek ⑨).
    canCreate: project.can.createTask === true,
    people: (members ?? [])
      .filter((m) => m.userId !== actor.user.id)
      .map((m) => ({ value: m.userId, label: m.name })),
  };
}

/** Filters only change the query string; react-query fetches, so the loader need not run again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

/** "Tugas" tab of a project: the shared task list pinned to this project. */
export default function ProjectTasksPage({ loaderData }: Route.ComponentProps) {
  const { filters, setFilters, resetFilters } = useUrlFilters(parseTaskFilters);
  const { seed, projectId, viewerId, canCreate, people } = loaderData;
  const createTo = canCreate ? newTaskInProject(projectId) : null;
  // No PageContainer: the project layout already pads the page.
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={2} size="h4">
          {PROJECT_TAB_COPY.title}
        </Title>
        {createTo && (
          <Button component={Link} to={createTo} leftSection={<FiPlus size="1.25em" aria-hidden />}>
            {PROJECT_TAB_COPY.create}
          </Button>
        )}
      </Group>
      <TaskFilters filters={filters} onChange={setFilters} projects={[]} people={people} locked />
      <TaskListView
        filters={filters}
        viewerId={viewerId}
        lockedProjectId={projectId}
        onResetFilters={() => resetFilters(TASK_NARROWING_PARAMS)}
        createTo={createTo}
        seed={seed}
      />
    </Stack>
  );
}
