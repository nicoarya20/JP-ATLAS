// Tasks ⑥ New task · Fill form (prototype tasks.form.jsx), on GET /api/app/tasks/form-options: the projects the
// viewer may add a task to, asked again each time the form opens. While they load the form waits; a failure offers
// Try again; no project at all says so (the server decides who may add tasks where). Just write ✦ waits the same
// way (FormProjectsGate). The form is form-body.tsx.
import { useLocalSearchParams } from 'expo-router';
import { FolderX } from 'lucide-react-native';
import { type ReactNode, useEffect } from 'react';

import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { type FormProjectWire, taskFormOptionsResource } from '@/data/tasks.form.api';

import { TaskPage } from '../parts/task-page';
import { F } from '../tasks.strings';
import { NewTaskForm } from './form-body';
import { ModeSwitch } from './mode-switch';

type GateProps = {
  /** 0 Just write, 1 Fill form. */
  mode: 0 | 1;
  testID: string;
  children: (projects: readonly FormProjectWire[]) => ReactNode;
};

/** New task's projects from form-options; until there are some, the page waits, offers Try again or says none. */
export function FormProjectsGate({ mode, testID, children }: GateProps) {
  const res = taskFormOptionsResource();
  const state = res.useSnapshot();
  useEffect(() => {
    void res.reload();
  }, [res]);
  const projects = state.data?.projects;
  if (projects?.length) return children(projects);
  return (
    <TaskPage modal title={F.newTitle} testID={testID}>
      <ModeSwitch value={mode} />
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

/**
 * New task · Fill form, on the project in the route (`/tasks/new/form?project=<id>`) when the server offers it, with
 * `title` filled in when Just write fell back here.
 */
export function TaskFormScreen() {
  const { project, title } = useLocalSearchParams<{ project?: string; title?: string }>();
  return (
    <FormProjectsGate mode={1} testID="screen-task-form">
      {(projects) => <NewTaskForm projects={projects} initialId={project} initialTitle={title} />}
    </FormProjectsGate>
  );
}
