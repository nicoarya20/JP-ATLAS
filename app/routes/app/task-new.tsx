import { Alert } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { getProjectDetail, listProjectMembers, listProjects } from '@server/project/project.query';
import { requestClock } from '@server/task/task.clock';
import { listTaskFormProjects } from '@server/task/task-form.query';
import { useCallback } from 'react';
import { FiLock } from 'react-icons/fi';
import { data, useNavigate } from 'react-router';
import { type SavedTask, TaskCreateForm } from '~/components/tasks/TaskCreateForm';
import { defaultKindId, workersOf } from '~/components/tasks/TaskForm';
import { newTaskValues } from '~/components/tasks/task-form';
import { TASK_FORM_COPY } from '~/components/tasks/task-form.copy';
import { PAGE_COPY } from '~/components/tasks/tasks.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/task-new';

const LIST_PATH = '/app/tasks';

export function meta() {
  return [{ title: 'Tugas Baru — Simple PM' }];
}

const forbidden = (reason: string) => data({ allowed: false as const, reason }, { status: 403 });

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const clock = requestClock();
  const asked = new URL(request.url).searchParams.get('proyek');
  const projects = await listTaskFormProjects(principal);
  const preset = asked ? projects.find((p) => p.id === asked) : undefined;
  if (asked && !preset) {
    // A project the viewer can see but not write (Pemantau, PM outside it) gets the reason; a
    // hidden or unknown id is ignored like a blank `?proyek=`, so nothing leaks about it.
    const detail = await getProjectDetail(principal, asked, clock.now);
    if (detail) return forbidden(TASK_FORM_COPY.viewerOnly);
  }
  if (projects.length === 0) {
    // Seeing projects without writing any (Pemantau, PM outside them) is "only viewing"; seeing none
    // is Q5: a task always belongs to a project, so someone outside every project cannot create one.
    const visible = await listProjects(principal, {
      scope: 'all',
      limit: 1,
      offset: 0,
      now: clock.now,
    });
    return forbidden(visible.total > 0 ? TASK_FORM_COPY.viewerOnly : PAGE_COPY.createBlocked);
  }
  const start = preset ?? (projects.length === 1 ? projects[0] : undefined);
  const members = start ? ((await listProjectMembers(principal, start.id)) ?? []) : undefined;
  const meWorks = members ? workersOf(members).some((m) => m.userId === actor.user.id) : false;
  const initial = newTaskValues(start?.id ?? null, meWorks ? actor.user.id : null);
  return {
    allowed: true as const,
    projects,
    initial: { ...initial, kindId: start ? defaultKindId(start.kinds) : null },
    members,
    viewer: { id: actor.user.id, name: actor.user.name },
    today: clock.today,
    // Cancel returns to where the form was opened from: the project's Tugas tab, or the task list.
    cancelTo: preset ? `/app/projects/${encodeURIComponent(preset.id)}/tasks` : LIST_PATH,
  };
}

export default function TaskNewPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const back = { to: LIST_PATH, label: TASK_FORM_COPY.back };
  // A stable callback: the form reports once per save, and a new function each render would re-run its effect.
  const toDetail = useCallback(
    (saved: SavedTask) => navigate(`/app/tasks/${saved.number}`),
    [navigate],
  );

  if (!loaderData.allowed) {
    return (
      <PageContainer>
        <PageHeader title={TASK_FORM_COPY.title} back={back} />
        <Alert color="gray" variant="light" icon={<FiLock size="1.25em" aria-hidden />}>
          {loaderData.reason}
        </Alert>
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <PageHeader
        title={TASK_FORM_COPY.title}
        description={TASK_FORM_COPY.description}
        back={back}
      />
      <TaskCreateForm
        projects={loaderData.projects}
        initialValues={loaderData.initial}
        initialMembers={loaderData.members}
        viewer={loaderData.viewer}
        today={loaderData.today}
        cancelTo={loaderData.cancelTo}
        onSubmitted={toDetail}
      />
    </PageContainer>
  );
}
