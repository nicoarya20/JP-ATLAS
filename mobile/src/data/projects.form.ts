/**
 * What the Projects forms show and send (Edit ⑬, Extend ⑫, New project ④), from the server's words: the status,
 * priority, role and extension-reason choices in the app's English, the edit form's starting values from the
 * project's detail, the Managers who may lead, and what an edit actually changes.
 */
import { projectMembersResource, projectResource } from './projects.api';
import { longDate } from './projects.dates';
import { STATUS_LABEL } from './projects.query';
import { EXTENSION_REASON } from './projects.view.tabs';
import type {
  ExtensionReasonWire,
  ProjectPriorityWire,
  ProjectRoleWire,
  ProjectStatusWire,
} from './projects.wire';
import type { ProjectChange, ProjectFieldsBody } from './projects.write';
import { PROJECT_ROLE } from './team';

/** The server's `PROJECT_CREATE_MEMBERS_MAX`: people a new project can start with besides its creator. */
export const CREATE_MEMBERS_MAX = 50;

/** One choice of a chip row or a picker: what is sent, and what is shown. */
export type Choice<V extends string> = { value: V; label: string };

const choices = <V extends string>(values: readonly V[], label: Record<V, string>) =>
  values.map((value) => ({ value, label: label[value] }));

export const STATUS_CHOICES = choices<ProjectStatusWire>(
  ['draft', 'active', 'on_hold', 'completed', 'canceled'],
  STATUS_LABEL,
);
/** A new project starts as a draft or active; the other statuses come later, from Edit. */
export const CREATE_STATUS_CHOICES = choices<'draft' | 'active'>(['draft', 'active'], STATUS_LABEL);

export const PRIORITY_CHOICES = choices<ProjectPriorityWire>(
  ['low', 'medium', 'high', 'critical'],
  { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
);

export const ROLE_CHOICES = choices<ProjectRoleWire>(['manager', 'member', 'viewer'], PROJECT_ROLE);

/** The server's four categories (`EXTENSION_REASON_CATEGORIES`), in the app's words. */
export const REASON_CHOICES = choices<ExtensionReasonWire>(
  ['scope_change', 'dependency', 'resource', 'other'],
  EXTENSION_REASON,
);

export type EditForm = {
  name: string;
  description: string;
  status: ProjectStatusWire;
  priority: ProjectPriorityWire;
  leadId: string | null;
  startDate: string | null;
  dueDate: string | null;
};

/** The edit form of project id as the server has it, or null before its detail arrives. */
export function getEditForm(id: string): EditForm | null {
  const p = projectResource(id).current();
  if (!p) return null;
  return {
    name: p.name,
    description: p.description ?? '',
    status: p.status,
    priority: p.priority,
    leadId: p.lead?.id ?? null,
    startDate: p.startDate,
    dueDate: p.dueDate,
  };
}

/**
 * Who may lead project id: its Managers (the server refuses anyone else). Until the members arrive, the Lead it has
 * now, so the picker still names them.
 */
export function getLeadChoices(id: string): Choice<string>[] {
  const members = projectMembersResource(id).current();
  if (members) {
    return members.items
      .filter((m) => m.role === 'manager')
      .map((m) => ({ value: m.userId, label: m.name }));
  }
  const lead = projectResource(id).current()?.lead;
  return lead ? [{ value: lead.id, label: lead.name }] : [];
}

/** What going from `from` to `to` sends: only the fields that changed, then the status, then the Lead. */
export function editChange(from: EditForm, to: EditForm): ProjectChange {
  const fields: ProjectFieldsBody = {};
  const name = to.name.trim();
  if (name !== from.name) fields.name = name;
  const description = to.description.trim();
  if (description !== from.description.trim()) fields.description = description || null;
  if (to.priority !== from.priority) fields.priority = to.priority;
  if (to.startDate !== from.startDate) fields.startDate = to.startDate;
  if (to.dueDate !== from.dueDate) fields.dueDate = to.dueDate;
  return {
    ...(Object.keys(fields).length > 0 && { fields }),
    ...(to.status !== from.status && { status: to.status }),
    ...(to.leadId !== from.leadId && to.leadId !== null && { leadId: to.leadId }),
  };
}

/** Nothing to send. */
export const unchanged = (c: ProjectChange) => !c.fields && !c.status && !c.leadId;

/** The Extend deadline sheet of project id; null before its detail arrives or while it has no deadline. */
export function getExtendForm(id: string) {
  const p = projectResource(id).current();
  if (!p?.dueDate) return null;
  return { name: p.name, current: p.dueDate, currentLabel: longDate(p.dueDate) };
}
