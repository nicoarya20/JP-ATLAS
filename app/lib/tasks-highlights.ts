/** "Tugas terlambat dan penting" of a project summary (S2-14), read through the task list API. */
import { useQuery } from '@tanstack/react-query';
import { fetchTasks, type TaskListItem, taskKeys } from './tasks-api';
import type { TaskListQuery } from './tasks-filters';

/** Most tasks the project summary highlights (P3 §2 Proyek ⑧). */
export const HIGHLIGHTS_MAX = 5;

/**
 * Up to `HIGHLIGHTS_MAX` open tasks of one project: overdue first (the server's `due=overdue`, so the
 * browser never judges a date), then high and critical priority ones not already listed.
 */
export async function fetchProjectHighlights(projectId: string): Promise<TaskListItem[]> {
  const base = {
    scope: 'project',
    projectId,
    status: ['todo', 'in_progress', 'in_review'],
    limit: HIGHLIGHTS_MAX,
  } as const satisfies Partial<TaskListQuery>;
  const [overdue, urgent] = await Promise.all([
    fetchTasks({ ...base, status: [...base.status], due: 'overdue', sort: 'due' }),
    fetchTasks({
      ...base,
      status: [...base.status],
      priority: ['critical', 'high'],
      sort: 'priority',
    }),
  ]);
  const seen = new Set(overdue.items.map((t) => t.id));
  const rest = urgent.items.filter((t) => !seen.has(t.id));
  return [...overdue.items, ...rest].slice(0, HIGHLIGHTS_MAX);
}

export function useProjectHighlights(projectId: string) {
  return useQuery({
    queryKey: taskKeys.highlights(projectId),
    queryFn: () => fetchProjectHighlights(projectId),
  });
}
