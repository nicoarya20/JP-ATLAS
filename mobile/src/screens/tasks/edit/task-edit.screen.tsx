// Tasks ⑧b Edit task (detail ⋯ › Edit task, prototype tasks.edit.jsx), on GET /api/app/tasks/:ref: the task the
// detail reads (its `can.update` lets the viewer in, or a deny code says why not, E-6), then form-options for the
// task's project (404 when that project is gone or hidden) and the form itself (edit-form.tsx). Status moves through
// the detail's buttons or the board, steps on the detail, and Created by is a record, so none of them is edited here.
import { router, useLocalSearchParams } from 'expo-router';
import { FolderX, ListX, Lock, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';

import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { capMessage } from '@/data/caps.messages';
import type { ResourceState } from '@/data/resource';
import { taskDetailResource } from '@/data/tasks.detail.api';
import type { TaskDetailWire } from '@/data/tasks.detail.wire';
import { taskFormOptionsResource } from '@/data/tasks.form.api';

import { TaskPage } from '../parts/task-page';
import { Act, Foot } from '../parts/task-parts';
import { F, S } from '../tasks.strings';
import { EditForm } from './edit-form';

const NOT_FOUND = 404;

const BackFoot = () => (
  <Foot>
    <Act grow label={F.back} onPress={() => router.back()} />
  </Foot>
);

/** A page that only says why there is no form, with Back. */
function Note({
  icon,
  title,
  text,
  testID,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  testID: string;
}) {
  return (
    <TaskPage title={F.editTitle} foot={<BackFoot />} testID={testID}>
      <EmptyState icon={icon} title={title} text={text} />
    </TaskPage>
  );
}

const Missing = () => (
  <Note
    icon={ListX}
    title={S.detail.missing}
    text={S.detail.missingText}
    testID="task-edit-missing"
  />
);

/** Loading, or failed with Try again, while `state` has no data yet. */
function Waiting({ state, onRetry }: { state: ResourceState<unknown>; onRetry: () => void }) {
  return (
    <TaskPage title={F.editTitle} testID="task-edit-loading">
      {state.phase === 'failed' ? (
        <FailedState testID="task-edit-failed" message={state.error?.message} onRetry={onRetry} />
      ) : (
        <LoadingState />
      )}
    </TaskPage>
  );
}

/** Edit task for the task in the route (`/tasks/<no>/edit`). */
export function TaskEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  return Number.isInteger(no) && no > 0 ? <EditGate no={no} /> : <Missing />;
}

function EditGate({ no }: { no: number }) {
  const res = taskDetailResource(no);
  const state = res.useSnapshot();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  const task = state.data;
  if (!task) {
    if (state.error?.status === NOT_FOUND) return <Missing />;
    return <Waiting state={state} onRetry={() => void res.reload()} />;
  }
  const can = task.can.update;
  if (can !== true) {
    const text = typeof can === 'string' ? capMessage(can) : F.lockedText;
    return <Note icon={Lock} title={F.locked} text={text} testID="task-edit-denied" />;
  }
  return <EditOptions task={task} />;
}

function EditOptions({ task }: { task: TaskDetailWire }) {
  const res = taskFormOptionsResource(task.project.id);
  const state = res.useSnapshot();
  useEffect(() => {
    void res.reload();
  }, [res]);
  const project = state.data?.projects[0];
  if (project) return <EditForm task={task} project={project} />;
  if (state.data || state.error?.status === NOT_FOUND) {
    return (
      <Note
        icon={FolderX}
        title={F.noProject}
        text={F.noProjectText}
        testID="task-edit-no-project"
      />
    );
  }
  return <Waiting state={state} onRetry={() => void res.reload()} />;
}
