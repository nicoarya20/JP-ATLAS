/** The whole Beranda in one call: shape, server clock, briefing from real data, role scope, soft failure, constant cost. */
import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import * as focusQuery from '../../server/home/home.focus.query';
import { getHome } from '../../server/home/home.service';
import { logger } from '../../server/logger';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { type HomeWorld, NOW, principalOf, seedHomeWorld } from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hsvc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

/** Narrows a widget in a test: a failed one is a failure of the test, with the section named. */
function data<T>(name: string, widget: { ok: true; data: T } | { ok: false }): T {
  if (!widget.ok) throw new Error(`section ${name} failed`);
  return widget.data;
}

describe('getHome', () => {
  it('takes greeting, date and clock from the server in the team zone', async () => {
    const home = await getHome(principalOf(w.me), NOW);
    expect(home.now).toMatchObject({
      today: '2026-10-07',
      greeting: 'pagi',
      dateLabel: 'Rabu, 7 Oktober 2026',
      timeLabel: '10.00',
    });
  });

  it('writes the briefing from my real data and stamps the minute it was put together', async () => {
    const briefing = data('briefing', (await getHome(principalOf(w.me), NOW)).briefing);
    expect(briefing.lines).toEqual([
      'Ada 1 tugas yang terlambat: "Bayar DP" sudah lewat 2 hari.',
      'Hari ini ada 3 tugas.',
      `Proyek "${w.projects.hajatan.name}" perlu perhatian: 1 tugas penting terlambat.`,
    ]);
    expect(briefing.updatedLabel).toBe('10.00');
  });

  it('fills every section for a manager', async () => {
    const home = await getHome(principalOf(w.me), NOW);
    expect(data('counters', home.counters).managedProjects).toBe(1);
    expect(data('focus', home.focus).total).toBe(7);
    expect(data('done', home.done).total).toBe(3);
    expect(data('projects', home.projects)).toHaveLength(2);
    expect(data('activity', home.activity)).toEqual([]);
    expect(data('ask', home.ask).map((a) => a.key)).toEqual(['behind', 'stalled', 'busiest']);
  });

  it('shows a plain member only their own work and projects, and no managed counts', async () => {
    const home = await getHome(principalOf(w.peer), NOW);
    expect(data('counters', home.counters)).toMatchObject({
      managedProjects: 0,
      memberProjects: 1,
    });
    expect(data('focus', home.focus).items.map((i) => i.title)).toEqual(['Pekerjaan Rina']);
    expect(data('projects', home.projects).map((p) => p.name)).toEqual([w.projects.hajatan.name]);
  });

  it('answers a calm, empty page for someone with no project', async () => {
    const home = await getHome(principalOf(w.outsider), NOW);
    expect(data('briefing', home.briefing).lines).toEqual(['Tidak ada yang mendesak hari ini.']);
    expect(data('counters', home.counters).memberProjects).toBe(0);
    expect(data('focus', home.focus).items).toEqual([]);
    expect(data('done', home.done).items).toEqual([]);
    expect(data('projects', home.projects)).toEqual([]);
    expect(data('agenda', home.agenda)).toEqual([]);
    expect(data('activity', home.activity)).toEqual([]);
  });

  it('fails one section softly: the others load and the briefing, which needs it, steps aside', async () => {
    const spy = spyOn(focusQuery, 'getFocus').mockRejectedValueOnce(new Error('boom'));
    const logged = spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const home = await getHome(principalOf(w.me), NOW);
      expect(home.focus).toEqual({ ok: false });
      expect(home.briefing).toEqual({ ok: false });
      expect(home.counters.ok).toBe(true);
      expect(home.projects.ok).toBe(true);
      expect(JSON.stringify(home)).not.toContain('boom');
      expect(logged).toHaveBeenCalledTimes(1);
      expect(logged.mock.calls[0]?.[0]).toMatchObject({ section: 'focus' });
    } finally {
      spy.mockRestore();
      logged.mockRestore();
    }
  });

  it('costs the same number of statements however much data there is', async () => {
    const small = countQueries();
    await getHome(principalOf(w.me), NOW, small.exec);
    await f.tasks(w.projects.hajatan, 40, (i) => ({
      assignee: w.me,
      due: `2026-10-${String(8 + (i % 20)).padStart(2, '0')}`,
    }));
    const big = countQueries();
    await getHome(principalOf(w.me), NOW, big.exec);
    expect(big.queries.length).toBe(small.queries.length);
    // counters 1, focus 3, projects 4, done 1, agenda 1, activity 2, two Ask Data facts 2.
    expect(small.queries.length).toBe(14);
  });
});
