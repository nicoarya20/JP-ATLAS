/** Wording of the leave status on Team cards (pure functions of `app/lib/team-availability.ts`). */
import { describe, expect, it } from 'bun:test';
import { availabilityText, shortDate, shortRange } from '../app/lib/team-availability';

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

describe('shortRange', () => {
  it('collapses a range inside one month and spells out one that crosses months', () => {
    expect(shortRange('2026-10-14', '2026-10-16')).toBe('14–16 Okt');
    expect(shortRange('2026-10-30', '2026-11-02')).toBe('30 Okt – 2 Nov');
  });

  it('writes a one-day range as a single date', () => {
    expect(shortRange('2026-10-14', '2026-10-14')).toBe('14 Okt');
  });
});

describe('availabilityText', () => {
  it('words an approved leave and a pending request', () => {
    expect(availabilityText({ kind: 'on_leave', until: '2026-10-16' })).toBe('Cuti sampai 16 Okt');
    expect(availabilityText({ kind: 'pending', from: '2026-10-14', to: '2026-10-16' })).toBe(
      'Pengajuan cuti 14–16 Okt',
    );
  });

  it('is null, not "Tersedia", when there is nothing to show', () => {
    expect(availabilityText(null)).toBeNull();
    expect(availabilityText(undefined)).toBeNull();
  });
});
