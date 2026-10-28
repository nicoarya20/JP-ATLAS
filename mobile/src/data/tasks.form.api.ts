/**
 * What the task forms read (map `phase2-map-tasks.md` §2d): `GET /api/app/tasks/form-options` — the projects the
 * viewer may add a task to, each with its active kinds and its phases — and, for Edit, the same for one project
 * (`?projectId=`, 404 when it is gone or hidden). The Assignee choices are the project's members
 * (`projectMembersResource`), not `team/picker`, which leaves a project's members out.
 *
 * The options change outside any task write (a new project, a kind added in its settings), so a form asks again each
 * time it opens rather than trusting what it read last time. Only the last FORM_CACHE answers are kept.
 */
import { apiGet } from '@/api/client';

import { type Resource, resource } from './resource';

export type FormKindWire = { id: string; name: string; baseKind: 'task' | 'issue' | 'idea' };
export type FormPhaseWire = { id: string; name: string };
export type FormProjectWire = {
  id: string;
  name: string;
  kinds: FormKindWire[];
  /** In the project's order; none for a project without phases. */
  phases: FormPhaseWire[];
};
export type FormOptionsWire = { projects: FormProjectWire[] };

/** Answers kept: New task's, and the few projects edited before it. */
export const FORM_CACHE = 8;

// Insertion order is use order, as the lists in tasks.api.ts; '' is New task's (every project).
const kept = new Map<string, Resource<FormOptionsWire>>();

/** The projects New task offers, or with `projectId` the one an edited task belongs to. */
export function taskFormOptionsResource(projectId?: string): Resource<FormOptionsWire> {
  const key = projectId ?? '';
  const had = kept.get(key);
  if (had) {
    kept.delete(key);
    kept.set(key, had);
    return had;
  }
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const made = resource<FormOptionsWire>(`tasks:form-options:${key}`, () =>
    apiGet<FormOptionsWire>(`/api/app/tasks/form-options${query}`),
  );
  kept.set(key, made);
  if (kept.size > FORM_CACHE) {
    const [oldest, old] = kept.entries().next().value as [string, Resource<FormOptionsWire>];
    kept.delete(oldest);
    old.forget();
  }
  return made;
}

/** Every kept answer dropped. test-only */
export const resetTaskForms = () => {
  for (const r of kept.values()) r.forget();
  kept.clear();
};
