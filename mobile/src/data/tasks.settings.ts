import { findProject } from './projects.state';
import type { Role } from './sample';
import { NEEDS_REVIEW, TASK_TYPE_MAX } from './sample/tasks.settings';
import { TYPES } from './tasks.shared';
import { getTasksState } from './tasks.state';

/*
 * Project settings of the Tasks module (prototype tasks.settings.jsx, opened from Project detail ⋯): Managers and
 * Admins see the review switch, task types and tags with their task counts; a Member sees "Not available".
 */

/** "1 task", "2 tasks". */
const count = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

export type TaskSettingsView =
  | { allowed: false }
  | {
      allowed: true;
      project: string;
      needsReview: boolean;
      types: { name: string; category: string; count: string }[];
      /** "3 of max. 6 active types · name and category only, does not affect review". */
      typeLimit: string;
      tags: { tag: string; count: string }[];
    };

/** Settings of project `projectId` for `role`; listed tasks only (archived ones are not counted). */
export function getTaskSettings(role: Role, projectId: string): TaskSettingsView {
  if (role === 'member') return { allowed: false };
  const project = findProject(projectId);
  if (!project) throw new Error(`Cannot open project settings: no project "${projectId}"`);
  const tasks = getTasksState().tasks.filter((t) => t.project === project.name);
  const tags = new Map<string, number>();
  for (const tag of tasks.flatMap((t) => t.tags)) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  return {
    allowed: true,
    project: project.name,
    needsReview: NEEDS_REVIEW[projectId] ?? false,
    types: TYPES.map(([name, category]) => ({
      name,
      category,
      count: count(tasks.filter((t) => t.type === name).length),
    })),
    typeLimit: `${TYPES.length} of max. ${TASK_TYPE_MAX} active types · name and category only, does not affect review`,
    tags: [...tags].map(([tag, n]) => ({ tag, count: count(n) })),
  };
}
