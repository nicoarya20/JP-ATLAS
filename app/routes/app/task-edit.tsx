import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { listProjectMembers } from '@server/project/project.query';
import { requestClock } from '@server/task/task.clock';
import { getTaskDetail } from '@server/task/task-detail.query';
import { loadTaskKinds, loadTaskPhases } from '@server/task/task-form.query';
import { useEffect, useState } from 'react';
import { data, useNavigate } from 'react-router';
import { TaskForm } from '~/components/tasks/TaskForm';
import { taskFieldErrors, toTaskPatch } from '~/components/tasks/task-form';
import { TASK_FORM_COPY } from '~/components/tasks/task-form.copy';
import { editTaskValues } from '~/components/tasks/task-form-edit';
import { NOT_FOUND_TEXT } from '~/components/tasks/tasks.copy';
import { useTaskActions } from '~/components/tasks/useTaskActions';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/task-edit';

const TASK_NUMBER = /^\d+$/;

export function meta() {
  return [{ title: 'Ubah Tugas — Simple PM' }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  if (!TASK_NUMBER.test(params.number)) throw data(NOT_FOUND_TEXT, { status: 404 });
  const principal = toPrincipal(actor);
  const clock = requestClock();
  const res = await getTaskDetail(principal, params.number, clock);
  if (!res.ok) throw data(NOT_FOUND_TEXT, { status: 404 });
  const { task } = res;
  // The server's own verdict: without `can.update` the page is the same 404 as a hidden task would get.
  if (task.can.update !== true) throw data(NOT_FOUND_TEXT, { status: 404 });
  const [members, kinds, phases] = await Promise.all([
    listProjectMembers(principal, task.project.id),
    loadTaskKinds([task.project.id]),
    loadTaskPhases([task.project.id]),
  ]);
  return {
    number: task.number,
    project: { id: task.project.id, name: task.project.name },
    kinds: kinds.get(task.project.id) ?? [],
    phases: phases.get(task.project.id) ?? [],
    members: members ?? [],
    initial: editTaskValues(task),
    viewer: { id: actor.user.id, name: actor.user.name },
    today: clock.today,
  };
}

export default function TaskEditPage({ loaderData }: Route.ComponentProps) {
  const { number, initial } = loaderData;
  const { update } = useTaskActions();
  const navigate = useNavigate();
  const detail = `/app/tasks/${number}`;
  const [saved, setSaved] = useState(false);
  // Navigate after the unsaved-changes guard re-rendered without its block.
  useEffect(() => {
    if (saved) navigate(detail);
  }, [saved, detail, navigate]);
  return (
    <PageContainer>
      <PageHeader
        title={TASK_FORM_COPY.editTitle}
        description={TASK_FORM_COPY.editDescription}
        back={{ to: detail, label: TASK_FORM_COPY.backToTask }}
      />
      <TaskForm
        mode="edit"
        project={loaderData.project}
        kinds={loaderData.kinds}
        phases={loaderData.phases}
        initial={initial}
        initialMembers={loaderData.members}
        viewer={loaderData.viewer}
        today={loaderData.today}
        submitting={update.loading}
        cancelTo={detail}
        onSubmit={async (values) => {
          const patch = toTaskPatch(initial, values);
          // Nothing changed: go back without a write, so no empty activity or false "saved" toast.
          if (Object.keys(patch).length === 0) {
            setSaved(true);
            return null;
          }
          const res = await update.run({ ref: String(number), patch });
          if (res.ok) {
            setSaved(true);
            return null;
          }
          return taskFieldErrors(res.error) ?? {};
        }}
      />
    </PageContainer>
  );
}
