// Projects screens still on the sample data in projects.store (edit, extend, archive, create): the list and the detail
// read the server (projects.api.ts, projects.list.ts, projects.view*.ts). These go to the API in the writes stage.
import { today } from './clock';
import { monthDay } from './dates';
import { me, person } from './people';
import { addDays, longDate, weekdayLongDate } from './projects.dates';
import { findProject, getProjectsState, taskCount, taskCountOf } from './projects.store';
import type { Role } from './sample';
import {
  PROJECT_DETAIL,
  PROJECT_STORY,
  PROJECT_TEMPLATES,
  TEMPLATE_PROJECT,
} from './sample/projects.extra';

export { getProjectTasks } from './projects.detail';

/** Edit project ⑬ for listed project id; null when it is not listed. */
export function getProjectEdit(id: string) {
  const p = getProjectsState().list.find((x) => x.id === id);
  if (!p) return null;
  // Only the project's Managers can be Lead; the sample has one each, so the pick holds the Lead alone.
  const managers = p.members.filter((n) => p.roles[n] === 'Manager');
  return {
    project: p,
    leads: managers.map((n) => ({ value: n, label: person(n)?.full ?? n })),
  };
}

/** Extend deadline ⑫ for listed project id: the current deadline and the sample's proposal (Atlas only). */
export function getProjectExtend(id: string) {
  const p = getProjectsState().list.find((x) => x.id === id);
  if (!p) return null;
  const x = PROJECT_DETAIL[id]?.extend;
  return {
    name: p.name,
    current: p.due,
    currentLabel: longDate(p.due),
    next: x?.next ?? null,
    reason: x?.reason ?? '',
    impact: x?.impact ?? null,
  };
}

/** Move to Archive ⑭ for listed project id: its name and what goes along ("5 tasks"). */
export function getProjectArchive(id: string) {
  const p = getProjectsState().list.find((x) => x.id === id);
  return p ? { id: p.id, name: p.name, tasks: taskCount(taskCountOf(id)) } : null;
}

/** Full names of the people the story names, minus the signed-in one (prototype projects.parts.jsx helpers). */
const helpers = (role: Role) =>
  PROJECT_STORY.helpers.filter((k) => k !== me(role).key).map((k) => person(k)?.full ?? k);

/** New project ③–⑦: who creates it, the story and its draft, the templates. */
export function getProjectCreate(role: Role) {
  const creator = me(role);
  const s = PROJECT_STORY;
  const draftName = findProject(s.project)?.name ?? '';
  const tasks = s.phases.reduce((n, p) => n + p.tasks.length, 0);
  return {
    creator,
    helpers: helpers(role),
    today: today(),
    story: s.text,
    draft: {
      name: draftName,
      summary: s.summary,
      dates: `${monthDay(s.start)} – ${longDate(s.end)} (${s.months} months)`,
      members: `${creator.name} (Manager), ${helpers(role)
        .map((f) => f.split(' ')[0])
        .join(', ')}`,
      count: `${s.phases.length} phases · ${s.phases.length} milestones · ${tasks} tasks`,
      phases: s.phases,
    },
    templates: PROJECT_TEMPLATES.map((t) => ({
      ...t,
      meta: `${t.days} days · ${t.phases} phases · ${t.tasks} tasks · ${t.types} task types`,
    })),
    template: TEMPLATE_PROJECT,
  };
}

/** "Mon, Oct 12, 2026" and the estimated end of a project of `days` days starting then. */
export const templateDates = (start: string, days: number) => ({
  start: weekdayLongDate(start),
  end: `${weekdayLongDate(addDays(start, days))} (${days} days)`,
});
