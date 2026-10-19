/** The in-memory project store: create, edit, delete, extend the due date, and the people on a project. */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  clean,
  emptyValues,
  NAME_MAX,
  QUICK_DUE,
  validate,
} from '../app/components/projects/project-form.logic';
import { dummyName, dummyProjectAccess } from '../app/components/projects/projects.access';
import { PEOPLE } from '../app/components/projects/projects.detail.dummy';
import { addDays } from '../app/components/projects/projects.gantt';
import {
  addPerson,
  addProject,
  changeRole,
  extendDue,
  type ProjectInput,
  removePerson,
  removeProject,
  seedProjects,
  uniqueId,
  updateProject,
} from '../app/components/projects/projects.logic';
import {
  attentionTasks,
  daysLeft,
  dueText,
  percentDone,
  percentTime,
  shortDate,
} from '../app/components/projects/projects.read';
import { getProjects, projectActions } from '../app/components/projects/projects.store';
import { TASKS } from '../app/components/tasks/tasks.dummy';
import { DUMMY_TODAY } from '../app/lib/dummy-clock';
import { ROLES } from '../server/permissions';

const TODAY = DUMMY_TODAY; // 2026-10-16, the dummy world's today
const input = (over: Partial<ProjectInput> = {}): ProjectInput => ({
  ...emptyValues('Nico'),
  name: 'Renovasi Dapur',
  ...over,
});
const atlas = () => seedProjects().find((p) => p.id === 'atlas');

describe('seed', () => {
  it('gives every listed project its detail, with a lead who is a Pengelola', () => {
    for (const p of seedProjects()) {
      expect(p.team.length).toBeGreaterThan(0);
      expect(p.team.find((m) => m.name === p.lead)?.role).toBe('manager');
      expect(p.members).toEqual(p.team.map((m) => m.name));
    }
  });
});

describe('addProject', () => {
  it('puts the new project first, with the creator as lead and one line of activity', () => {
    const { list, id } = addProject(seedProjects(), input({ members: ['Rina'] }), 'Nico', TODAY);
    expect(list[0]?.id).toBe(id);
    expect(list).toHaveLength(4);
    expect(list[0]?.team.map((m) => `${m.name}:${m.role}`)).toEqual([
      'Nico:manager',
      'Rina:member',
    ]);
    expect(list[0]?.activity).toEqual([{ who: 'Nico', text: 'membuat proyek', date: TODAY }]);
    expect(list[0]?.done).toBe(0);
  });

  it('does not list the lead twice when they are also picked as a member', () => {
    const { list } = addProject(seedProjects(), input({ members: ['Nico', 'Rina'] }), 'Nico');
    expect(list[0]?.members).toEqual(['Nico', 'Rina']);
  });

  it('makes ids from the name, accent-free, and unique against the existing ones', () => {
    const list = seedProjects();
    expect(uniqueId('Proyek Atlas', list)).toBe('proyek-atlas');
    expect(uniqueId('Atlas', list)).toBe('atlas-2');
    expect(uniqueId('Rapat Évaluasi!!', list)).toBe('rapat-evaluasi');
    expect(uniqueId('???', list)).toBe('proyek');
  });
});

describe('updateProject / removeProject', () => {
  it('keeps the role of people who stay, and makes the new lead a Pengelola', () => {
    const r = updateProject(
      seedProjects(),
      'atlas',
      input({ name: 'Atlas 2', lead: 'Rina', members: ['Nico', 'Agus'] }),
      'Nico',
    );
    if (!r.ok) throw new Error('expected ok');
    const p = r.list.find((x) => x.id === 'atlas');
    expect(p?.name).toBe('Atlas 2');
    expect(p?.team.map((m) => `${m.name}:${m.role}`)).toEqual([
      'Rina:manager',
      'Nico:manager',
      'Agus:viewer',
    ]);
    expect(p?.activity[0]?.text).toBe('memperbarui data proyek');
  });

  it('answers NOT_FOUND for an id that is gone, and removes only the one asked for', () => {
    expect(updateProject(seedProjects(), 'zzz', input(), 'Nico')).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(removeProject(seedProjects(), 'atlas').map((p) => p.id)).toEqual(['sinar', 'migrasi']);
  });
});

describe('extendDue', () => {
  it('moves the date later, counts the extension and logs it', () => {
    const r = extendDue(seedProjects(), 'atlas', '2026-11-15', 'Nico', TODAY);
    if (!r.ok) throw new Error('expected ok');
    const p = r.list.find((x) => x.id === 'atlas');
    expect(p?.due).toBe('2026-11-15');
    expect(p?.extensions).toBe(2);
    expect(p?.extended).toBe('Diperpanjang ×2');
    expect(p?.activity[0]?.text).toBe('memperpanjang tenggat 31 Okt → 15 Nov');
  });

  it('refuses a date that is not later than the current one', () => {
    for (const d of ['2026-10-31', '2026-10-01']) {
      expect(extendDue(seedProjects(), 'atlas', d, 'Nico', TODAY)).toEqual({
        ok: false,
        code: 'NOT_LATER',
      });
    }
  });

  it('turns a late project into an at-risk one once its new date is ahead', () => {
    const r = extendDue(seedProjects(), 'migrasi', '2026-11-05', 'Dodi', TODAY);
    if (!r.ok) throw new Error('expected ok');
    const p = r.list.find((x) => x.id === 'migrasi');
    expect([p?.condition, p?.conditionNote]).toEqual(['at_risk', 'tenggat baru diperpanjang']);
  });
});

describe('people on a project', () => {
  it('changes a role, but never the lead’s', () => {
    const r = changeRole(seedProjects(), 'atlas', 'Rina', 'viewer', 'Nico', TODAY);
    expect(
      r.ok && r.list.find((x) => x.id === 'atlas')?.team.find((m) => m.name === 'Rina')?.role,
    ).toBe('viewer');
    expect(changeRole(seedProjects(), 'atlas', 'Nico', 'member', 'Nico')).toEqual({
      ok: false,
      code: 'IS_LEAD',
    });
  });

  it('adds someone once, and refuses a second time', () => {
    const r = addPerson(seedProjects(), 'atlas', 'Budi', 'member', 'Nico', TODAY);
    expect(r.ok && r.list.find((x) => x.id === 'atlas')?.members).toContain('Budi');
    expect(addPerson(seedProjects(), 'atlas', 'Rina', 'member', 'Nico')).toEqual({
      ok: false,
      code: 'ALREADY_MEMBER',
    });
  });

  it('removes someone, but not the lead', () => {
    const r = removePerson(seedProjects(), 'atlas', 'Agus', 'Nico', TODAY);
    expect(r.ok && r.list.find((x) => x.id === 'atlas')?.members).toEqual(['Nico', 'Rina', 'Dodi']);
    expect(removePerson(seedProjects(), 'atlas', 'Nico', 'Nico')).toEqual({
      ok: false,
      code: 'IS_LEAD',
    });
    expect(removePerson(seedProjects(), 'atlas', 'Zed', 'Nico')).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
});

describe('reading helpers (the dummy world’s today is 16 Oct 2026)', () => {
  it('computes progress, elapsed time and days left for Proyek Atlas', () => {
    const p = atlas();
    if (!p) throw new Error('seed');
    expect(percentDone(p)).toBe(70);
    expect(percentTime(p, TODAY)).toBe(78);
    expect(daysLeft(p, TODAY)).toBe(15);
    expect(percentDone({ done: 0, total: 0 })).toBe(0);
  });

  it('picks the tasks that need a look: late, then waiting for review, then by date', () => {
    expect(attentionTasks(TASKS, 'Proyek Atlas', TODAY).map((t) => t.number)).toEqual([12, 17, 14]);
    expect(attentionTasks(TASKS, 'Proyek Atlas', TODAY, 1)).toHaveLength(1);
    expect(attentionTasks(TASKS, 'Proyek Tidak Ada', TODAY)).toEqual([]);
  });

  it('reads a due date at a glance', () => {
    expect(dueText('2026-10-14', TODAY)).toBe('Terlambat 2 hari');
    expect(dueText('2026-10-16', TODAY)).toBe('Hari ini');
    expect(dueText('2026-10-17', TODAY)).toBe('Besok');
    expect(dueText('2026-10-20', TODAY)).toBe(shortDate('2026-10-20'));
  });
});

describe('who sees which button', () => {
  const as = (appRole: string, impersonating = false) =>
    dummyProjectAccess({ id: 'u1', appRole: appRole as never, impersonating });

  it('hides every button from a Member', () => {
    expect(as(ROLES.MEMBER)).toEqual({ canCreate: false, canManage: false, canDelete: false });
  });

  it.each([ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN])(
    'shows create, edit and delete to %s',
    (r) => {
      expect(as(r)).toEqual({ canCreate: true, canManage: true, canDelete: true });
    },
  );

  it('keeps delete away from a super-admin who is impersonating', () => {
    expect(as(ROLES.SUPER_ADMIN, true)).toEqual({
      canCreate: true,
      canManage: true,
      canDelete: false,
    });
  });

  it('maps the signed-in person onto the dummy first name when there is one', () => {
    const known = PEOPLE.map((p) => p.name);
    expect(dummyName('Nico Arya Pratama', known)).toBe('Nico');
    expect(dummyName('Siti Aminah', known)).toBe('Siti Aminah');
  });
});

describe('the project form', () => {
  it('starts today, due in a month, so only the name has to be typed', () => {
    const v = emptyValues('Nico');
    expect([v.start, v.due, v.lead, v.status]).toEqual([
      TODAY,
      addDays(TODAY, 30),
      'Nico',
      'active',
    ]);
  });

  it('asks for a name, within the limit, and a due date not before the start', () => {
    expect(validate(input({ name: '  ' })).name).toBeDefined();
    expect(validate(input({ name: 'x'.repeat(NAME_MAX + 1) })).name).toBeDefined();
    expect(validate(input({ start: '2026-10-20', due: '2026-10-19' })).due).toBeDefined();
    expect(validate(input())).toEqual({});
  });

  it('trims what was typed and offers four quick due dates', () => {
    expect(clean(input({ name: '  Dapur  ', description: ' baru ' }))).toMatchObject({
      name: 'Dapur',
      description: 'baru',
    });
    expect(QUICK_DUE.map((q) => q.days)).toEqual([7, 14, 30, 90]);
  });
});

describe('projectActions (the in-memory store)', () => {
  beforeEach(() => projectActions.reset());

  it('creates, extends and removes, and the list follows', () => {
    const id = projectActions.create(input({ name: 'Renovasi Dapur' }), 'Nico');
    expect(getProjects()[0]?.id).toBe(id);
    expect(projectActions.extend(id, addDays(TODAY, 60), 'Nico')).toBeNull();
    expect(getProjects()[0]?.extensions).toBe(1);
    projectActions.remove(id);
    expect(getProjects().map((p) => p.id)).toEqual(['atlas', 'sinar', 'migrasi']);
  });

  it('reports why a write did not go through, and leaves the list alone', () => {
    const before = getProjects();
    expect(projectActions.extend('atlas', '2026-01-01', 'Nico')).toBe('NOT_LATER');
    expect(projectActions.removePerson('atlas', 'Nico', 'Nico')).toBe('IS_LEAD');
    expect(getProjects()).toBe(before);
  });
});
