// The task forms' side of the stubbed `/api/app/tasks` (tasks-fixtures): the people and projects the Tasks tests share,
// what `GET /tasks/form-options` and `GET /projects/:id/members` answer, and `POST /tasks` and `PATCH /tasks/:ref`
// applied to the stub's rows the way `server/task/task.service.ts` does (map `phase2-map-tasks.md` §0). test-only
import type { ProjectMemberWire } from '@/data/projects.wire';
import type { TaskDetailWire } from '@/data/tasks.detail.wire';
import type { FormProjectWire } from '@/data/tasks.form.api';
import type { TaskListItemWire } from '@/data/tasks.wire';

import type { AuthReply } from './auth-server';

export const ATLAS = { id: 'p-atlas', name: 'Atlas Project', status: 'active' };
export const SINAR = { id: 'p-sinar', name: 'PT Sinar Website', status: 'active' };
/** The seeded session's account (session-fixtures). */
export const NICO = { id: 'u-nico', name: 'Nico Arya' };
export const DODI = { id: 'u-dodi', name: 'Dodi Hartono' };
/** Watches Atlas: a Viewer, so never offered as an assignee. */
export const RINA = { id: 'u-rina', name: 'Rina Wulandari' };
export const SRI = { id: 'u-sri', name: 'Sri Lestari' };

/** Atlas has three kinds and two phases; Sinar one kind and no phases. */
export const FORM_PROJECTS: FormProjectWire[] = [
  {
    id: ATLAS.id,
    name: ATLAS.name,
    kinds: [
      { id: 'k-task', name: 'Task', baseKind: 'task' },
      { id: 'k-bug', name: 'Bug', baseKind: 'issue' },
      { id: 'k-idea', name: 'Idea', baseKind: 'idea' },
    ],
    phases: [
      { id: 'ph-design', name: 'Design' },
      { id: 'ph-dev', name: 'Development' },
    ],
  },
  {
    id: SINAR.id,
    name: SINAR.name,
    kinds: [{ id: 'k-sinar-task', name: 'Task', baseKind: 'task' }],
    phases: [],
  },
];

const member = (p: { id: string; name: string }, role: ProjectMemberWire['role']) => ({
  userId: p.id,
  name: p.name,
  image: null,
  jobTitle: null,
  role,
  isLead: false,
  joinedAt: '2026-09-01T02:00:00.000Z',
});
export const MEMBERS: Record<string, ProjectMemberWire[]> = {
  [ATLAS.id]: [member(NICO, 'manager'), member(DODI, 'member'), member(RINA, 'viewer')],
  [SINAR.id]: [member(SRI, 'manager'), member(NICO, 'member')],
};

const PEOPLE = [NICO, DODI, RINA, SRI];
const PROJECTS = [ATLAS, SINAR];
const notFound = (error: string): AuthReply => ({
  status: 404,
  body: { error, code: 'NOT_FOUND' },
});
const bad = (error: string): AuthReply => ({ status: 422, body: { error, code: 'VALIDATION' } });

type Body = Record<string, unknown>;
type Ctx = {
  rows: TaskListItemWire[];
  /** What only a task's detail carries, by number. */
  extra: (no: number) => Partial<TaskDetailWire>;
  /** `row(number, over)` of tasks-fixtures. */
  makeRow: (no: number, over: Partial<TaskListItemWire>) => TaskListItemWire;
  /** The detail the stub answers for a row. */
  detail: (r: TaskListItemWire) => TaskDetailWire;
  /** The projects form-options offers; default FORM_PROJECTS. */
  projects?: FormProjectWire[];
};

/** form-options, members, create and update over `ctx`. */
export function formServer(ctx: Ctx) {
  const offered = ctx.projects ?? FORM_PROJECTS;
  const options = (url: string): AuthReply => {
    const id = new URL(url).searchParams.get('projectId');
    if (!id) return { body: { projects: offered } };
    const one = FORM_PROJECTS.find((p) => p.id === id);
    return one ? { body: { projects: [one] } } : notFound('Proyek tidak ditemukan.');
  };
  const members = (projectId: string): AuthReply =>
    MEMBERS[projectId]
      ? { body: { items: MEMBERS[projectId] } }
      : notFound('Proyek tidak ditemukan.');
  /** The fields both writes share, checked as the server checks them. */
  const apply = (r: TaskListItemWire, body: Body): AuthReply | null => {
    const project = FORM_PROJECTS.find((p) => p.id === r.project.id);
    const d = ctx.extra(r.number);
    if (
      body.startDate &&
      (body.dueDate ?? r.dueDate) &&
      String(body.startDate) > String(body.dueDate ?? r.dueDate)
    )
      return bad('Tanggal mulai tidak boleh sesudah tenggat.');
    if ('title' in body) r.title = String(body.title);
    if ('priority' in body) r.priority = body.priority as TaskListItemWire['priority'];
    if ('dueDate' in body) r.dueDate = (body.dueDate as string | null) ?? null;
    if ('assigneeId' in body) r.assignee = PEOPLE.find((p) => p.id === body.assigneeId) ?? null;
    if ('phaseId' in body) r.phase = project?.phases.find((p) => p.id === body.phaseId) ?? null;
    if ('kindId' in body) {
      const kind = project?.kinds.find((k) => k.id === body.kindId);
      if (!kind) return bad('Jenis tugas ini tidak ada di proyek ini.');
      d.kind = kind;
    }
    if ('startDate' in body) d.startDate = (body.startDate as string | null) ?? null;
    if ('description' in body) d.description = (body.description as string | null) ?? null;
    return null;
  };
  const create = (body: Body): AuthReply => {
    const project = PROJECTS.find((p) => p.id === body.projectId);
    if (!project) return notFound('Proyek tidak ditemukan.');
    const no = Math.max(0, ...ctx.rows.map((r) => r.number)) + 1;
    const r = ctx.makeRow(no, { project, phase: null });
    const kinds = FORM_PROJECTS.find((p) => p.id === project.id)?.kinds ?? [];
    ctx.extra(no).kind = kinds.find((k) => k.baseKind === 'task') ?? kinds[0];
    const refused = apply(r, { kindId: ctx.extra(no).kind?.id, ...body });
    if (refused) return refused;
    ctx.rows.push(r);
    return { status: 201, body: ctx.detail(r) };
  };
  const update = (r: TaskListItemWire, body: Body): AuthReply => {
    if (!Object.keys(body).length) return bad('Tidak ada yang diubah.');
    return apply(r, body) ?? { body: ctx.detail(r) };
  };
  return { options, members, create, update };
}
