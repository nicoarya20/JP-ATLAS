import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { PLAN_COPY } from '../../app/components/projects/plan/plan.copy';
import {
  emptyMilestoneValues,
  emptyPhaseValues,
  type PhaseFormValues,
  phaseValues,
  toMilestoneInput,
  toPhaseInput,
  toPhasePatch,
  validateMilestone,
  validatePhase,
} from '../../app/components/projects/plan/plan-form';
import {
  describeRange,
  isMilestoneOverdue,
  movedOrder,
} from '../../app/components/projects/plan/plan-view';
import { PROJECT_TABS } from '../../app/components/projects/projects.copy';
import { PHASE_NAME_MAX } from '../../server/project/project.limits';

// test-only fixtures
const ph = (id: string) => ({ id }) as Parameters<typeof movedOrder>[0][number];
const three = [ph('a'), ph('b'), ph('c')];

describe('movedOrder', () => {
  it('moves a phase one place up or down', () => {
    expect(movedOrder(three, 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(movedOrder(three, 'b', 'down')).toEqual(['a', 'c', 'b']);
  });

  it('answers null at the ends and for an unknown phase', () => {
    expect(movedOrder(three, 'a', 'up')).toBeNull();
    expect(movedOrder(three, 'c', 'down')).toBeNull();
    expect(movedOrder(three, 'zz', 'up')).toBeNull();
  });

  it('does not change the list it was given', () => {
    movedOrder(three, 'b', 'up');
    expect(three.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('describeRange', () => {
  it('covers both dates, one date and none', () => {
    expect(describeRange('2026-10-01', '2026-10-15')).toBe('1 Okt 2026 – 15 Okt 2026');
    expect(describeRange('2026-10-01', null)).toBe('Mulai 1 Okt 2026');
    expect(describeRange(null, '2026-10-15')).toBe('Selesai 15 Okt 2026');
    expect(describeRange(null, null)).toBe(PLAN_COPY.noDates);
  });
});

describe('isMilestoneOverdue', () => {
  const m = (dueDate: string, reachedAt: string | null) =>
    ({ dueDate, reachedAt }) as Parameters<typeof isMilestoneOverdue>[0];
  it('is only for an unreached milestone before the server day', () => {
    expect(isMilestoneOverdue(m('2026-10-18', null), '2026-10-19')).toBe(true);
    expect(isMilestoneOverdue(m('2026-10-19', null), '2026-10-19')).toBe(false);
    expect(isMilestoneOverdue(m('2026-10-18', '2026-10-17T00:00:00.000Z'), '2026-10-19')).toBe(
      false,
    );
  });
});

describe('phase form', () => {
  const values = (over: Partial<PhaseFormValues> = {}): PhaseFormValues => ({
    ...emptyPhaseValues(),
    name: 'Perencanaan',
    ...over,
  });

  it('asks for a name and limits its length', () => {
    expect(validatePhase(values({ name: '   ' })).name).toBeDefined();
    expect(validatePhase(values({ name: 'x'.repeat(PHASE_NAME_MAX + 1) })).name).toContain(
      String(PHASE_NAME_MAX),
    );
    expect(validatePhase(values())).toEqual({});
  });

  it('rejects an end date before the start date, and allows the same day', () => {
    const bad = validatePhase(values({ startDate: '2026-10-10', endDate: '2026-10-09' }));
    expect(bad.endDate).toBeDefined();
    expect(validatePhase(values({ startDate: '2026-10-10', endDate: '2026-10-10' }))).toEqual({});
  });

  it('leaves blanks out of the create body', () => {
    expect(toPhaseInput(values({ name: ' Uji ', description: '  ' }))).toEqual({ name: 'Uji' });
    expect(
      toPhaseInput(values({ description: 'Isi', startDate: '2026-10-01', endDate: '2026-10-02' })),
    ).toEqual({
      name: 'Perencanaan',
      description: 'Isi',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
    });
  });

  it('sends only what changed, and null for a cleared field', () => {
    const initial = phaseValues({
      name: 'A',
      description: 'Lama',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      status: 'not_started',
    } as Parameters<typeof phaseValues>[0]);
    expect(toPhasePatch(initial, initial)).toEqual({});
    expect(
      toPhasePatch(initial, { ...initial, description: '', endDate: null, status: 'done' }),
    ).toEqual({ description: null, endDate: null, status: 'done' });
    expect(toPhasePatch(initial, { ...initial, name: ' B ' })).toEqual({ name: 'B' });
  });
});

describe('milestone form', () => {
  it('needs a title and a date', () => {
    const errors = validateMilestone(emptyMilestoneValues());
    expect(errors.title).toBeDefined();
    expect(errors.dueDate).toBeDefined();
    expect(
      validateMilestone({ title: 'Serah terima', dueDate: '2026-11-30', phaseId: null }),
    ).toEqual({});
  });

  it('builds the body with the phase or null', () => {
    expect(toMilestoneInput({ title: ' Rilis ', dueDate: '2026-11-30', phaseId: 'ph-1' })).toEqual({
      title: 'Rilis',
      dueDate: '2026-11-30',
      phaseId: 'ph-1',
    });
    expect(toMilestoneInput({ title: 'Rilis', dueDate: '2026-11-30', phaseId: null }).phaseId).toBe(
      null,
    );
  });
});

describe('project tabs', () => {
  it('names the tabs Ringkasan · Tugas · Tahapan · Anggota', () => {
    expect(Object.values(PROJECT_TABS)).toEqual(['Ringkasan', 'Tugas', 'Tahapan', 'Anggota']);
  });

  it('puts Tahapan between Tugas and Anggota in the layout, at the phases path', () => {
    const src = readFileSync('app/routes/app/project/layout.tsx', 'utf8');
    const block = src.slice(src.indexOf('const TABS = ['), src.indexOf('] as const;'));
    const order = [...block.matchAll(/\{ to: '([^']*)', label: PROJECT_TABS\.(\w+)/g)].map((m) => [
      m[1],
      m[2],
    ]);
    expect(order).toEqual([
      ['', 'summary'],
      ['tasks', 'tasks'],
      ['phases', 'phases'],
      ['members', 'members'],
    ]);
    const routes = readFileSync('app/routes.ts', 'utf8');
    expect(routes).toContain("route('phases', 'routes/app/project/phases.tsx')");
  });
});
