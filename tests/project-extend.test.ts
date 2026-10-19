/** Asking to move a due date: it must be later, and it must come with a reason. */
import { describe, expect, it } from 'bun:test';
import {
  earliestDue,
  reasonText,
  validateExtension,
} from '../app/components/projects/project-extend.logic';
import { DETAILS } from '../app/components/projects/projects.detail.dummy';
import { currentPhase, nextMilestone } from '../app/components/projects/projects.read';

const ask = (over: Partial<Parameters<typeof validateExtension>[0]> = {}) =>
  validateExtension({
    currentDue: '2026-10-31',
    due: '2026-11-15',
    category: 'client',
    note: '',
    ...over,
  });

describe('validateExtension', () => {
  it('accepts a later date with a reason', () => {
    expect(ask()).toEqual({});
  });

  it.each([
    ['no date', null],
    ['the same date', '2026-10-31'],
    ['an earlier date', '2026-10-01'],
  ])('refuses %s', (_, due) => {
    expect(ask({ due }).due).toContain('31');
  });

  it('wants a reason, and a written note when the reason is "Lainnya"', () => {
    expect(ask({ category: null }).category).toBeDefined();
    expect(ask({ category: 'other', note: '   ' }).note).toBeDefined();
    expect(ask({ category: 'other', note: 'Vendor terlambat' })).toEqual({});
  });

  it('starts counting the day after the current due date', () => {
    expect(earliestDue('2026-10-31')).toBe('2026-11-01');
  });
});

describe('reasonText', () => {
  it('reads the chosen reason, then the note', () => {
    expect(reasonText('client', '')).toBe('Menunggu klien');
    expect(reasonText('other', ' Vendor terlambat ')).toBe('Lainnya: Vendor terlambat');
    expect(reasonText(null, '')).toBe('');
  });
});

describe('phase helpers', () => {
  const atlas = DETAILS.atlas?.phases ?? [];

  it('finds the phase being worked on, and the next milestone that is not reached', () => {
    expect(currentPhase(atlas)?.name).toBe('Pengembangan');
    expect(nextMilestone(atlas)?.name).toBe('Rilis beta');
  });

  it('falls back to the first unfinished phase, and to nothing for an empty project', () => {
    expect(
      currentPhase(
        atlas.map((p) => ({ ...p, state: p.state === 'current' ? 'upcoming' : p.state })),
      )?.name,
    ).toBe('Pengembangan');
    expect(currentPhase([])).toBeUndefined();
    expect(nextMilestone([])).toBeUndefined();
  });
});
