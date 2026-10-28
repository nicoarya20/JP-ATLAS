/**
 * The Overview's "Tasks needing attention" (map `phase2-map-projects.md` §2c): three task-list reads of the
 * project — overdue, awaiting review, due today — merged in that order, each task once.
 *
 * TODO(mobile-W3-tasks): the task types here are a minimal copy of the four fields read, so this file does
 * not depend on the Tasks module's wire types while that module is uncommitted. Swap them for `tasks.wire`
 * once Tasks is committed (agreed with the coordinator, 28 Oct 2026).
 */
import { apiGet } from '@/api/client';

import { type Resource, resource } from './resource';

/** The fields of a task-list item the Overview reads (`server/task/task.dto.ts`). */
export type AttentionTaskWire = {
  id: string;
  number: number;
  title: string;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
};

type TaskPageWire = { items: AttentionTaskWire[] };

export type AttentionReason = 'Overdue' | 'Awaiting review' | 'Due today';

export type AttentionData = { task: AttentionTaskWire; reason: AttentionReason }[];

/** Rows per reason: the Overview is a pointer to the Tasks tab, not the list itself. */
export const ATTENTION_PER_REASON = 5;

const ASKS: readonly { reason: AttentionReason; filter: string }[] = [
  { reason: 'Overdue', filter: 'due=overdue' },
  { reason: 'Awaiting review', filter: 'status=in_review' },
  { reason: 'Due today', filter: 'due=today' },
];

async function loadAttention(projectId: string): Promise<AttentionData> {
  const base = `/api/app/tasks?scope=project&projectId=${encodeURIComponent(projectId)}&limit=${ATTENTION_PER_REASON}`;
  const pages = await Promise.all(ASKS.map((a) => apiGet<TaskPageWire>(`${base}&${a.filter}`)));
  const seen = new Set<string>();
  return ASKS.flatMap((a, i) =>
    (pages[i]?.items ?? []).flatMap((task) => {
      if (seen.has(task.id)) return [];
      seen.add(task.id);
      return [{ task, reason: a.reason }];
    }),
  );
}

const made = new Map<string, Resource<AttentionData>>();

/** The attention rows of one project, kept for the session like its other reads (`projects.api.ts`). */
export function projectAttentionResource(projectId: string): Resource<AttentionData> {
  const known = made.get(projectId);
  if (known) return known;
  const r = resource<AttentionData>(`project:${projectId}:attention`, () =>
    loadAttention(projectId),
  );
  made.set(projectId, r);
  return r;
}
