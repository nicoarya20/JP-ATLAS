/** Wording of the leave status on Team cards (pure functions of `app/lib/team-availability.ts`). */
import { describe, expect, it } from 'bun:test';
import { availabilityText, shortDate } from '../app/lib/team-availability';

describe('shortDate', () => {
  it('writes day and short Indonesian month without a leading zero', () => {
    expect(shortDate('2026-10-16')).toBe('16 Okt');
    expect(shortDate('2026-01-05')).toBe('5 Jan');
    expect(shortDate('2026-05-31')).toBe('31 Mei');
    expect(shortDate('2026-08-17')).toBe('17 Agu');
  });

  it('hands back what it cannot read instead of inventing a date', () => {
    expect(shortDate('besok')).toBe('besok');
    expect(shortDate('2026-13-01')).toBe('2026-13-01');
  });
});

describe('availabilityText', () => {
  it('words a recorded leave that is under way', () => {
    expect(availabilityText({ kind: 'on_leave', until: '2026-10-16' })).toBe('Cuti sampai 16 Okt');
  });

  it('is null, not "Tersedia", when there is nothing to show', () => {
    expect(availabilityText(null)).toBeNull();
    expect(availabilityText(undefined)).toBeNull();
  });
});
