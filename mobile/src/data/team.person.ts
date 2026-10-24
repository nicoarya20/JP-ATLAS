// Team ② (prototype team.person.jsx): one person as the viewer's role may see them — shared projects, and their
// active tasks unless a Member is looking at someone else.
import { me, person } from './people';
import { PROJECTS, type Role } from './sample';
import { AVAILABLE, TEAM_LIST } from './sample/team';
import { getTasksState } from './tasks.state';
import type { TeamPersonData, TeamSource } from './team';
import { activeOf, isOverdue, loadOf } from './team.load';

/** Team ② for person `key` as `role` sees them; null when `key` is nobody in the sample. */
export function getTeamPerson(
  role: Role,
  key: string,
  src: TeamSource = {},
): TeamPersonData | null {
  const p = person(key);
  if (!p || p.key !== key) return null;
  const tasks = src.tasks ?? getTasksState().tasks;
  const projects = src.projects ?? PROJECTS;
  const status = TEAM_LIST.find((o) => o.key === key)?.status ?? AVAILABLE;
  const viewer = me(role);
  const theirs = projects.filter((pr) => pr.members.includes(p.name));
  const shared = theirs.filter((pr) => role === 'admin' || pr.members.includes(viewer.name));
  const hidden = theirs.filter((pr) => !shared.includes(pr)).map((pr) => pr.name);
  const seesTasks = role !== 'member' || viewer.key === p.key;
  return {
    person: p,
    status,
    available: status === AVAILABLE,
    projectsTitle: role === 'admin' ? 'Projects' : 'Shared projects',
    projects: shared.map((pr) => ({ id: pr.id, name: pr.name })),
    tasks: seesTasks
      ? {
          load: loadOf(p.name, tasks),
          rows: activeOf(p.name, tasks).map((t) => ({
            no: t.no,
            title: `#${t.no} ${t.title}`,
            sub: `${t.project} · ${t.when}`,
            pill: isOverdue(t) ? 'Overdue' : t.status,
          })),
          hidden,
        }
      : null,
  };
}
