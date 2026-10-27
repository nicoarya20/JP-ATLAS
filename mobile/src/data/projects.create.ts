/**
 * What the three forms of this module read: Edit project, Extend deadline and New project.
 *
 * All three are shaped by one fact about the server: a project's fields, its status and its Lead
 * live on three routes, so one Save is up to three requests (`projects.api.write.ts` owns the
 * order). The form therefore carries the status and the Lead as separate values and only sends the
 * ones that actually changed.
 *
 * Two things the prototype had are **not** here, and both are written down in
 * `docs/phase2-gap-disembunyikan.md`:
 *
 * - The unique-name check. `project.name` has no unique constraint
 *   (`server/db/schema.project.ts`), and tasks point at a `projectId`, so two projects may share a
 *   name. The rule had no basis left; keeping it would refuse a name the server accepts.
 * - "Impact of change" in the Extend sheet. There is no preview endpoint (GAP A-10), and the only
 *   client-side version — counting the tasks on the page this app happens to hold — would be right
 *   for a slice and read as a total.
 */
import type { ApiError } from '@/api/errors';

import { today } from './clock';
import { appWhoami, projectDetail, projectMembers, projectPicker } from './projects.api';
import { type CapState, capState } from './projects.api.map';
import { leadOptions, type PickerOption, pickerOptions } from './projects.api.members';
import type { WireProjectPriority, WireProjectStatus } from './projects.api.types';
import { priorityWord, statusWord } from './projects.api.values';
import { longDate } from './projects.dates';
import type { ResourcePhase } from './resource';
import type { ProjectStatus } from './sample/projects';
import type { ProjectPriorityWord } from './projects.api.values';
import type { ResourceState } from './resource';
import { viewer } from './viewer';

/** The Edit form's own copy of the project, in the words the form shows. */
export type ProjectEditFields = {
  name: string;
  desc: string;
  status: ProjectStatus;
  priority: ProjectPriorityWord;
  /** `userId` of the Lead, or '' when the project has none. */
  leadId: string;
  /** ISO dates, or null — both sides are nullable on the server (GAP A-15). */
  startDate: string | null;
  dueDate: string | null;
};

export type ProjectEditView = {
  id: string;
  fields: ProjectEditFields;
  /** This project's Managers: the only people it may hand the Lead to. */
  leads: PickerOption[];
  /** How Save must be drawn (`can.update`): `hidden` means the form is not the caller's to use. */
  mayEdit: CapState;
};

export type Loaded<T> = {
  view: T | null;
  phase: ResourcePhase;
  error: ApiError | null;
  notFound: boolean;
};

const loaded = <T,>(state: ResourceState<unknown>, view: T | null): Loaded<T> => ({
  view,
  phase: state.phase,
  error: state.error,
  notFound: state.error?.status === 404,
});

/** The detail and the member list: the form needs both, the second only for the Lead select. */
export async function ensureProjectEdit(id: string): Promise<void> {
  await Promise.all([projectDetail(id).ensure(), projectMembers(id).ensure()]);
}

export const reloadProjectEdit = (id: string): Promise<unknown[]> =>
  Promise.all([projectDetail(id).reload(), projectMembers(id).reload()]);

/** ⑬ Edit project `id`. */
export function getProjectEdit(id: string): Loaded<ProjectEditView> {
  const state = projectDetail(id).peek();
  const detail = state.data;
  if (!detail) return loaded<ProjectEditView>(state, null);
  return loaded(state, {
    id: detail.id,
    fields: {
      name: detail.name,
      desc: detail.description ?? '',
      status: statusWord(detail.status),
      priority: priorityWord(detail.priority),
      leadId: detail.lead?.id ?? '',
      startDate: detail.startDate,
      dueDate: detail.dueDate,
    },
    leads: leadOptions(projectMembers(id).current()),
    mayEdit: capState(detail.can, 'update'),
  });
}

/** The Edit form in a component. */
export function useProjectEdit(id: string): Loaded<ProjectEditView> {
  projectDetail(id).use();
  projectMembers(id).use();
  return getProjectEdit(id);
}

export type ProjectExtendView = {
  id: string;
  name: string;
  /** The deadline in force, as an ISO date, for the picker's lower bound. */
  current: string;
  /** "Oct 31, 2026". */
  currentLabel: string;
};

export const ensureProjectExtend = (id: string): Promise<unknown> => projectDetail(id).ensure();

/**
 * ⑫ Extend deadline of project `id`.
 *
 * A project with no deadline cannot have one extended — the route moves a date later, it does not
 * set a first one — so the sheet has nothing to show and says so by returning null.
 */
export function getProjectExtend(id: string): Loaded<ProjectExtendView> {
  const state = projectDetail(id).peek();
  const detail = state.data;
  if (!detail?.dueDate) return loaded<ProjectExtendView>(state, null);
  return loaded(state, {
    id: detail.id,
    name: detail.name,
    current: detail.dueDate,
    currentLabel: longDate(detail.dueDate),
  });
}

/** The Extend sheet in a component. */
export function useProjectExtend(id: string): Loaded<ProjectExtendView> {
  projectDetail(id).use();
  return getProjectExtend(id);
}

export type ProjectFormView = {
  /** The signed-in account: the creator, who becomes Manager and Lead server-side. */
  creator: { userId: string; full: string };
  /** The server's today, for the start date the form opens on (K1). */
  today: string;
  /** People the new project may start with. */
  people: PickerOption[];
  /** Whether the caller may create a project at all (`caps.createProject`, A-17). */
  mayCreate: boolean;
};

/** The picker and the app capabilities the New project form needs. */
export async function ensureProjectForm(): Promise<void> {
  await Promise.all([projectPicker().ensure(), appWhoami.ensure()]);
}

export const reloadProjectForm = (): Promise<unknown[]> =>
  Promise.all([projectPicker().reload(), appWhoami.reload()]);

/**
 * ④ New project, the form path.
 *
 * `today` comes from the server's clock, not the device's: a start date built from a phone an hour
 * past midnight in another zone would be yesterday on the team's calendar. It is read inside the
 * function and not stored in a module constant — a constant would run at import, before the clock
 * arrives, and `requireClock()` would throw there and take the whole app's first render with it
 * (§4 of the pattern doc).
 */
export function getProjectForm(): Loaded<ProjectFormView> {
  const state = projectPicker().peek();
  const me = viewer();
  return loaded(state, {
    creator: { userId: me.userId, full: me.full },
    today: today(),
    people: pickerOptions(state.data),
    mayCreate: appWhoami.current()?.caps.createProject ?? false,
  });
}

/** The New project form in a component. */
export function useProjectForm(): Loaded<ProjectFormView> {
  projectPicker().use();
  appWhoami.use();
  return getProjectForm();
}

/** The status the form's "Initial status" chips offer; only these two may start a project. */
export const INITIAL_STATUSES: readonly WireProjectStatus[] = ['draft', 'active'];

/** The priorities the forms offer, in order. */
export const PRIORITIES: readonly WireProjectPriority[] = ['low', 'medium', 'high', 'critical'];
