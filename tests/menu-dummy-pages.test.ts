/** Pure helpers behind the dummy Events, Inbox and Tim pages (Sampah is real in this branch). */
import { describe, expect, it } from 'bun:test';
import { EVENTS } from '../app/components/events/events.dummy';
import { filterEvents, groupEvents, groupOf } from '../app/components/events/events.filter';
import { monthCells } from '../app/components/events/MonthGrid';
import { LATEST_NEWS, NEEDS_ACTION } from '../app/components/inbox/inbox.dummy';
import { TEAM_PROJECTS } from '../app/components/team/team.dummy';
import { canSeeWorkload, filterTeam, summaryOf } from '../app/components/team/team.filter';

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
/** Value that must exist; fails the test with a clear message instead of using `!`. */
function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error('expected a value');
  return v;
}

describe('events', () => {
  it('keeps today events (even finished) under Akan datang and earlier days under Sudah lewat', () => {
    expect(ids(filterEvents(EVENTS, 'upcoming', '', 'all'))).toEqual([
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
    ]);
    expect(ids(filterEvents(EVENTS, 'past', '', 'all'))).toEqual(['e0']);
  });

  it('filters by kind and by title or location', () => {
    expect(ids(filterEvents(EVENTS, 'upcoming', '', 'acara'))).toEqual(['e5']);
    expect(ids(filterEvents(EVENTS, 'upcoming', 'pantry', 'all'))).toEqual(['e5']);
  });

  it('groups upcoming events into Hari ini, Minggu ini and Nanti, in that order', () => {
    const rows = filterEvents(EVENTS, 'upcoming', '', 'all');
    expect(groupEvents(rows, 'upcoming').map((g) => g.group)).toEqual([
      'Hari ini',
      'Minggu ini',
      'Nanti',
    ]);
    expect(groupOf(must(EVENTS.find((e) => e.id === 'e3')))).toBe('Minggu ini');
    expect(groupEvents([], 'past')).toEqual([]);
  });

  it('builds October 2026 starting on Thursday with a Monday-first week', () => {
    const cells = monthCells(2026, 10);
    expect(cells.filter((c) => c === null)).toHaveLength(3);
    expect(cells.filter((c) => c !== null)).toHaveLength(31);
  });
});

describe('inbox', () => {
  it('has unique ids and links for every item', () => {
    const all = [...NEEDS_ACTION, ...LATEST_NEWS];
    expect(new Set(ids(all)).size).toBe(all.length);
    for (const i of all) expect(i.to.startsWith('/app/')).toBe(true);
    for (const i of NEEDS_ACTION) expect(i.actionLabel).toBeTruthy();
  });
});

describe('team', () => {
  it('summarises a project like the wireframe', () => {
    expect(summaryOf(must(TEAM_PROJECTS[0]))).toBe(
      'Proyek Atlas · 3 orang · 9 tugas aktif · 2 terlambat',
    );
  });

  it('shows workload only for the viewer themself unless they manage the project', () => {
    const [dodi, nico] = must(TEAM_PROJECTS[0]).members;
    expect(canSeeWorkload(must(dodi))).toBe(true);
    expect(canSeeWorkload(must(nico))).toBe(false);
    expect(canSeeWorkload(must(nico), true)).toBe(true);
  });

  it('narrows by project and name and drops empty projects', () => {
    expect(filterTeam(TEAM_PROJECTS, 'Proyek Atlas', '')).toHaveLength(1);
    expect(filterTeam(TEAM_PROJECTS, null, 'budi').map((p) => p.name)).toEqual([
      'Portal Klien PT Sinar',
    ]);
    expect(filterTeam(TEAM_PROJECTS, null, 'zzz')).toEqual([]);
  });
});
