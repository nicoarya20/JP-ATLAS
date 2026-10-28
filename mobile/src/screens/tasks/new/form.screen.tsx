// Tasks ⑥ New task · Fill form (prototype tasks.form.jsx), on GET /api/app/tasks/form-options: the projects the
// viewer may add a task to, asked again each time the form opens. While they load the form waits; a failure offers
// Try again; no project at all says so (the server decides who may add tasks where). The form is form-body.tsx.
import { useLocalSearchParams } from 'expo-router';
import { FolderX } from 'lucide-react-native';
import { useEffect } from 'react';

import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { taskFormOptionsResource } from '@/data/tasks.form.api';

import { TaskPage } from '../parts/task-page';
import { F } from '../tasks.strings';
import { NewTaskForm } from './form-body';
import { ModeSwitch } from './mode-switch';

/** New task · Fill form, on the project in the route (`/tasks/new/form?project=<id>`) when the server offers it. */
export function TaskFormScreen() {
  const { project } = useLocalSearchParams<{ project?: string }>();
  const res = taskFormOptionsResource();
  const state = res.use();
  useEffect(() => {
    void res.reload();
  }, [res]);
  const projects = state.data?.projects;
  if (projects?.length) return <NewTaskForm projects={projects} initialId={project} />;
  return (
    <TaskPage modal title={F.newTitle} testID="screen-task-form">
      <ModeSwitch />
      {projects ? (
        <EmptyState
          testID="form-no-projects"
          icon={FolderX}
          title={F.noProjects}
          text={F.noProjectsText}
        />
      ) : state.phase === 'failed' ? (
        <FailedState
          testID="form-failed"
          message={state.error?.message}
          onRetry={() => void res.reload()}
        />
      ) : (
        <LoadingState testID="form-loading" />
      )}
    </TaskPage>
  );
}
