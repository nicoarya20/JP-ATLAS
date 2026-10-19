// DUMMY: logika murni untuk daftar Proyek buatan; ganti dengan panggilan API saat S1 dibuat.
import type { ProjectPriority, ProjectStatus } from '@server/pm/enums';
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import {
  DETAILS,
  EMPTY_DETAIL,
  PEOPLE,
  type ProjectDetail,
  type ProjectPerson,
  type ProjectRole,
} from './projects.detail.dummy';
import { type DummyProject, PROJECTS } from './projects.dummy';
import { shortDate } from './projects.read';

export type ProjectRecord = DummyProject & ProjectDetail;

/** The fields the create and edit forms send. */
export type ProjectInput = {
  name: string;
  description: string;
  status: Extract<ProjectStatus, 'draft' | 'active'>;
  priority: ProjectPriority;
  lead: string;
  start: string;
  due: string;
  members: string[];
};

export type Failure = 'NOT_FOUND' | 'NOT_LATER' | 'IS_LEAD' | 'ALREADY_MEMBER';
export type Result = { ok: true; list: ProjectRecord[] } | { ok: false; code: Failure };

const fail = (code: Failure): Result => ({ ok: false, code });
const ok = (list: ProjectRecord[]): Result => ({ ok: true, list });
const patch = (list: ProjectRecord[], id: string, f: (p: ProjectRecord) => ProjectRecord) =>
  list.map((p) => (p.id === id ? f(p) : p));

export const extendedLabel = (n: number) => (n > 0 ? `Diperpanjang ×${n}` : undefined);

/** The three projects of the dummy world, with their detail attached. */
export function seedProjects(): ProjectRecord[] {
  return PROJECTS.map((p) => ({ ...p, ...(DETAILS[p.id] as ProjectDetail) }));
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'proyek';

/** A URL-safe id from the name, made unique against the existing ones. */
export function uniqueId(name: string, list: readonly ProjectRecord[]): string {
  const base = slug(name);
  const taken = new Set(list.map((p) => p.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

const jobOf = (name: string) => PEOPLE.find((p) => p.name === name)?.jobTitle ?? 'Anggota tim';

/** Who is on the project: the lead as Pengelola, then the rest as Anggota, without repeats. */
function teamOf(input: ProjectInput, before: readonly ProjectPerson[] = []): ProjectPerson[] {
  const names = [input.lead, ...input.members.filter((m) => m !== input.lead)];
  return names.map((name) => ({
    name,
    jobTitle: jobOf(name),
    // Someone already on the team keeps their role, unless they just became the lead.
    role: name === input.lead ? 'manager' : (before.find((p) => p.name === name)?.role ?? 'member'),
  }));
}

export function addProject(
  list: ProjectRecord[],
  input: ProjectInput,
  creator: string,
  today: string = DUMMY_TODAY,
): { list: ProjectRecord[]; id: string } {
  const id = uniqueId(input.name, list);
  const team = teamOf(input);
  const record: ProjectRecord = {
    id,
    name: input.name,
    lead: input.lead,
    status: input.status,
    condition: 'on_track',
    conditionNote: 'Belum ada tugas',
    done: 0,
    total: 0,
    start: input.start,
    due: input.due,
    members: team.map((p) => p.name),
    description: input.description,
    priority: input.priority,
    team,
    ...EMPTY_DETAIL,
    activity: [{ who: creator, text: 'membuat proyek', date: today }],
  };
  return { list: [record, ...list], id };
}

export const removeProject = (list: ProjectRecord[], id: string) => list.filter((p) => p.id !== id);

export function updateProject(
  list: ProjectRecord[],
  id: string,
  input: ProjectInput,
  who: string,
  today: string = DUMMY_TODAY,
): Result {
  if (!list.some((p) => p.id === id)) return fail('NOT_FOUND');
  return ok(
    patch(list, id, (p) => {
      const team = teamOf(input, p.team);
      return {
        ...p,
        name: input.name,
        description: input.description,
        status: input.status,
        priority: input.priority,
        lead: input.lead,
        start: input.start,
        due: input.due,
        team,
        members: team.map((m) => m.name),
        activity: [{ who, text: 'memperbarui data proyek', date: today }, ...p.activity],
      };
    }),
  );
}

/** Moving the due date later reopens the question "are we on time?": a project that was late is at risk again. */
export function extendDue(
  list: ProjectRecord[],
  id: string,
  newDue: string,
  who: string,
  today: string = DUMMY_TODAY,
  reason?: string,
): Result {
  const p = list.find((x) => x.id === id);
  if (!p) return fail('NOT_FOUND');
  if (newDue <= p.due) return fail('NOT_LATER');
  const wasLate = p.condition === 'off_track' && newDue >= today;
  return ok(
    patch(list, id, (x) => ({
      ...x,
      due: newDue,
      extensions: x.extensions + 1,
      extended: extendedLabel(x.extensions + 1),
      condition: wasLate ? 'at_risk' : x.condition,
      conditionNote: wasLate ? 'tenggat baru diperpanjang' : x.conditionNote,
      activity: [
        {
          who,
          text: `memperpanjang tenggat ${shortDate(x.due)} → ${shortDate(newDue)}`,
          date: today,
          note: reason,
        },
        ...x.activity,
      ],
    })),
  );
}

const setTeam = (
  p: ProjectRecord,
  team: ProjectPerson[],
  text: string,
  who: string,
  today: string,
) => ({
  ...p,
  team,
  members: team.map((m) => m.name),
  activity: [{ who, text, date: today }, ...p.activity],
});

export function changeRole(
  list: ProjectRecord[],
  id: string,
  name: string,
  role: ProjectRole,
  who: string,
  today: string = DUMMY_TODAY,
): Result {
  const p = list.find((x) => x.id === id);
  if (!p?.team.some((m) => m.name === name)) return fail('NOT_FOUND');
  // The lead stays a Pengelola: moving the lead is a separate choice, made in the form.
  if (name === p.lead) return fail('IS_LEAD');
  const team = p.team.map((m) => (m.name === name ? { ...m, role } : m));
  return ok(
    patch(list, id, (x) =>
      setTeam(x, team, `mengubah peran ${name} menjadi ${roleWord(role)}`, who, today),
    ),
  );
}

const roleWord = (r: ProjectRole) =>
  ({ manager: 'Pengelola', member: 'Anggota', viewer: 'Pemantau' })[r];

export function addPerson(
  list: ProjectRecord[],
  id: string,
  name: string,
  role: ProjectRole,
  who: string,
  today: string = DUMMY_TODAY,
): Result {
  const p = list.find((x) => x.id === id);
  if (!p) return fail('NOT_FOUND');
  if (p.team.some((m) => m.name === name)) return fail('ALREADY_MEMBER');
  const team = [...p.team, { name, role, jobTitle: jobOf(name) }];
  return ok(
    patch(list, id, (x) =>
      setTeam(x, team, `menambahkan ${name} sebagai ${roleWord(role)}`, who, today),
    ),
  );
}

export function removePerson(
  list: ProjectRecord[],
  id: string,
  name: string,
  who: string,
  today: string = DUMMY_TODAY,
): Result {
  const p = list.find((x) => x.id === id);
  if (!p?.team.some((m) => m.name === name)) return fail('NOT_FOUND');
  if (name === p.lead) return fail('IS_LEAD');
  const team = p.team.filter((m) => m.name !== name);
  return ok(
    patch(list, id, (x) => setTeam(x, team, `mengeluarkan ${name} dari proyek`, who, today)),
  );
}

/** The form's view of a project, for "Ubah proyek". The dummy world only has Draf and Berjalan. */
export const toInput = (p: ProjectRecord): ProjectInput => ({
  name: p.name,
  description: p.description,
  status: p.status as ProjectInput['status'],
  priority: p.priority,
  lead: p.lead,
  start: p.start,
  due: p.due,
  members: p.members.filter((m) => m !== p.lead),
});

/** A project that was deleted: kept whole, so restoring brings back its team, phases and feed. */
export type TrashedProject = ProjectRecord & { deletedAt: string };
export type Bin = { list: ProjectRecord[]; trash: TrashedProject[] };

export function trashProject(
  list: ProjectRecord[],
  trash: TrashedProject[],
  id: string,
  today: string = DUMMY_TODAY,
): Bin | null {
  const p = list.find((x) => x.id === id);
  if (!p) return null;
  return { list: removeProject(list, id), trash: [{ ...p, deletedAt: today }, ...trash] };
}

/** Puts it back first in the list; if its id was taken in the meantime it gets a fresh one. */
export function restoreProject(
  list: ProjectRecord[],
  trash: TrashedProject[],
  id: string,
): Bin | null {
  const item = trash.find((x) => x.id === id);
  if (!item) return null;
  const { deletedAt: _deletedAt, ...record } = item;
  const back = list.some((x) => x.id === id)
    ? { ...record, id: uniqueId(record.name, list) }
    : record;
  return { list: [back, ...list], trash: trash.filter((x) => x.id !== id) };
}
