// Gate of the project write screens (Edit, Extend deadline, Move to Trash): their form starts from the project's
// detail, so it waits for it (loading, or failed with "Try again"), and a viewer the project's `can{}` does not let in
// is sent back to the project.
import { Redirect } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { View } from 'react-native';

import { FailedState, LoadingState } from '@/components/state/section-state';
import { projectResource } from '@/data/projects.api';
import type { ProjectDetailWire } from '@/data/projects.wire';

type ProjectGateProps = {
  id: string;
  /** May this viewer open the screen, by the detail's `can{}`. */
  allowed: (p: ProjectDetailWire) => boolean;
  children: (p: ProjectDetailWire) => ReactNode;
};

/** The screen once the detail is in and allows it. */
export function ProjectGate({ id, allowed, children }: ProjectGateProps) {
  const res = projectResource(id);
  const state = res.use();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  const p = state.data;
  if (p) return allowed(p) ? children(p) : <Redirect href={`/projects/${id}`} />;
  return (
    <View className="flex-1 bg-background px-4 pt-4">
      {state.phase === 'failed' ? (
        <FailedState
          testID="project-gate-failed"
          message={state.error?.message}
          onRetry={() => void res.reload()}
        />
      ) : (
        <LoadingState testID="project-gate-loading" />
      )}
    </View>
  );
}
