// Who a task in project `projectId` can be given to (T-2: one assignee): its Managers and Members from
// GET /projects/:id/members, "Unassigned" first. While they load, or when they failed, the choice is only
// "Unassigned" and the hint says why, so the form can still be saved.
import { useEffect } from 'react';

import { projectMembersResource } from '@/data/projects.api';
import { assigneeOptions } from '@/data/tasks.form';

import { F } from '../tasks.strings';

/** `{ people, hint }` for AssigneeEdit; `current` stays a choice on Edit even when no longer a worker. */
export function useTaskPeople(projectId: string, current?: { id: string; name: string } | null) {
  const res = projectMembersResource(projectId);
  const state = res.use();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  const people = assigneeOptions(state.data?.items ?? [], F.unassigned, current);
  if (state.data) return { people, hint: undefined };
  return { people, hint: state.phase === 'failed' ? state.error?.message : F.peopleLoading };
}
