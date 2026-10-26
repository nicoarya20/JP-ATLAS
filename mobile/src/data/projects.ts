// Projects data in one call per screen, the swap point to the API: today built from the sample data in projects.store,
// later a fetch of /api/app/projects returning the same shapes. The detail tabs are in projects.detail.ts.
import { today } from './clock';
import { monthDay } from './dates';
import { me, person } from './people';
import { addDays, longDate, weekdayLongDate } from './projects.dates';
import { ofWho, teammates, whoLabel } from './projects.people';
import { applyQuery, isFiltered, type ProjectsQuery, searchProjects } from './projects.query';
import {
  findProject,
  getProjectsState,
  isArchivedProject,
  type ProjectItem,
  taskCount,
  taskCountOf,
} from './projects.store';
import type { Role } from './sample';
import {
  PROJECT_DETAIL,
  PROJECT_STORY,
  PROJECT_TEMPLATES,
  TEMPLATE_PROJECT,
} from './sample/projects.extra';
import { viewer as signedIn, someSamePerson } from './viewer';

export {
  getProjectMembers,
  getProjectOverview,
  getProjectPhases,
  getProjectTasks,
} from './projects.detail';

/** A project card of the list. */
export type ProjectCard = Pick<
  ProjectItem,
  'id' | 'name' | 'status' | 'lead' | 'progress' | 'members'
> & {
  /** "! Needs attention · 1 important task overdue", or the health alone. */
  health: string;
  /** "70%", or "–" before any progress. */
  percent: string;
  /** "Oct 31". */
  due: string;
};

/** none = the person is in no project (or the pick has none); noMatch = the query or search leaves nothing. */
export type ProjectsEmpty = 'none' | 'noMatch' | null;

export type ProjectsList = {
  /** Teammates of the people row (first names); a Member's are those sharing a project. */
  people: string[];
  /** The My projects chip shows (not for a Member: every project they see is theirs). */
  mine: boolean;
  /** "Rina's projects · 3" under the row, when someone is picked. */
  whoLine: string | null;
  cards: ProjectCard[];
  empty: ProjectsEmpty;
  /** The dot on the filter icon. */
  filtered: boolean;
};

export type ProjectsListOptions = { who?: string; query: ProjectsQuery; search: string };

/** The projects `role` sees: a Member only those they are in, everyone else all of them. */
export function projectsFor(role: Role, list: readonly ProjectItem[] = getProjectsState().list) {
  if (role !== 'member') return [...list];
  const name = me(role).name;
  return list.filter((p) => p.members.includes(name));
}

const card = (p: ProjectItem): ProjectCard => ({
  id: p.id,
  name: p.name,
  status: p.status,
  lead: p.lead,
  progress: p.progress,
  members: p.members,
  health: p.why ? `${p.health} · ${p.why}` : p.health,
  percent: p.progress ? `${p.progress}%` : '–',
  due: monthDay(p.due),
});

/** Projects ① for `role`: people row, the pick, then the query and search applied. */
export function getProjectsList(role: Role, o: ProjectsListOptions): ProjectsList {
  const member = role === 'member';
  const name = me(role).name;
  const visible = projectsFor(role);
  const filtered = isFiltered(o.query) || !!o.search.trim();
  const list = searchProjects(applyQuery(ofWho(visible, o.who, name), o.query), o.search);
  return {
    people: teammates(visible, name),
    mine: !member,
    whoLine: o.who ? `${whoLabel(o.who, member)} · ${list.length}` : null,
    cards: list.map(card),
    empty: list.length ? null : filtered ? 'noMatch' : 'none',
    filtered: isFiltered(o.query),
  };
}

/** Header of the detail, the same on every tab. */
export type ProjectHeader = Pick<
  ProjectItem,
  'id' | 'name' | 'status' | 'health' | 'why' | 'lead' | 'extended'
> & {
  /** "Oct 31, 2026". */
  dueLong: string;
  archived: boolean;
  /** Manager or Admin, and not in Archive: the ⋯ menu, Extend deadline and the tab actions. */
  canEdit: boolean;
};

/** Detail header of project id for `role`; null when no such project (an old link) or a Member is not in it. */
export function getProjectHeader(role: Role, id: string): ProjectHeader | null {
  const p = findProject(id);
  if (!p || (role === 'member' && !someSamePerson(p.members, signedIn(role)))) return null;
  const archived = isArchivedProject(id);
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    health: p.health,
    why: p.why,
    lead: p.lead,
    extended: p.extended,
    dueLong: longDate(p.due),
    archived,
    canEdit: role !== 'member' && !archived,
  };
}

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
