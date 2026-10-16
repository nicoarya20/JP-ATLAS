import { Stack } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { listProjects } from '@server/project/project.query';
import { requestClock } from '@server/task/task.clock';
import { countTasks, listTasks } from '@server/task/task.query';
import { PICKER_LIMIT_MAX, pickPeople } from '@server/team/picker.query';
import { CreateTaskButton, NEW_TASK_PATH } from '~/components/tasks/CreateTaskButton';
import { type FilterOption, TaskFilters } from '~/components/tasks/TaskFilters';
import { type TaskListSeed, TaskListView } from '~/components/tasks/TaskListView';
import { PAGE_COPY } from '~/components/tasks/tasks.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { toJson } from '~/lib/loader-json';
import type { TaskCounts, TaskPage } from '~/lib/tasks-api';
import {
  isGroupedView,
  parseTaskFilters,
  TASK_NARROWING_PARAMS,
  toTaskQuery,
} from '~/lib/tasks-filters';
import { useUrlFilters } from '~/lib/use-url-filters';
import type { Route } from './+types/tasks';

/** Projects offered by the Proyek filter, by name; more than this is rare in a family team. */
const PROJECT_OPTION_LIMIT = 100;

export function meta() {
  return [{ title: 'Tugas — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const clock = requestClock();
  const filters = parseTaskFilters(new URL(request.url).searchParams);
  const query = toTaskQuery(filters, { viewerId: actor.user.id });
  const grouped = isGroupedView(filters);
  const [page, counts, projects, people] = await Promise.all([
    // The grouped view loads each schedule group itself; one row is enough for `caps.createTask`.
    listTasks(principal, grouped ? { ...query, limit: 1 } : query, clock),
    grouped ? countTasks(principal, clock) : null,
    listProjects(principal, {
      scope: 'all',
      sort: 'name',
      limit: PROJECT_OPTION_LIMIT,
      offset: 0,
      now: clock.now,
    }),
    // Only people who may create projects may search everyone; others filter by "Saya".
    pickPeople(principal, { limit: PICKER_LIMIT_MAX }),
  ]);
  // No cursor is sent, so BAD_CURSOR cannot happen; an empty page keeps the types honest.
  const ok: TaskPage = page.ok ? page : { items: [], nextCursor: null, caps: {} };
  const seed: TaskListSeed = {
    query,
    first: grouped ? null : toJson<TaskPage>(ok),
    counts: counts ? toJson<TaskCounts>(counts) : null,
    loadedAt: Date.now(),
  };
  return {
    seed,
    viewerId: actor.user.id,
    // `caps.createTask` absent = not a worker in any live project yet (Q5).
    canCreate: ok.caps.createTask === true,
    projects: projects.items.map((p): FilterOption => ({ value: p.id, label: p.name })),
    people: people.ok
      ? people.items
          .filter((p) => p.id !== actor.user.id)
          .map((p): FilterOption => ({ value: p.id, label: p.name }))
      : [],
  };
}

/** Filters only change the query string; react-query fetches, so the loader need not run again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

/** Tugas: "Tugas saya" in schedule groups, or a table of every task the viewer may see. */
export default function TasksPage({ loaderData }: Route.ComponentProps) {
  const { filters, setFilters, resetFilters } = useUrlFilters(parseTaskFilters);
  const { seed, viewerId, canCreate, projects, people } = loaderData;
  return (
    <PageContainer>
      <PageHeader
        title={PAGE_COPY.title}
        description={PAGE_COPY.description}
        actions={<CreateTaskButton canCreate={canCreate} />}
      />
      <Stack gap="lg">
        <TaskFilters filters={filters} onChange={setFilters} projects={projects} people={people} />
        <TaskListView
          filters={filters}
          viewerId={viewerId}
          onResetFilters={() => resetFilters(TASK_NARROWING_PARAMS)}
          createTo={canCreate ? NEW_TASK_PATH : null}
          seed={seed}
        />
      </Stack>
    </PageContainer>
  );
}
