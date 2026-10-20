/** Proyek saya: my running projects, worst first, with the same condition and progress as the Proyek menu. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { getProjects } from '../../server/home/home.projects.query';
import { listProjects } from '../../server/project/project.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { type HomeWorld, NOW, principalOf, seedHomeWorld } from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hprj' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

describe('getProjects', () => {
  it('lists only running projects I belong to, the one at risk before the one on track', async () => {
    const rows = await getProjects(principalOf(w.me), NOW);
    expect(rows.map((r) => r.name)).toEqual([w.projects.hajatan.name, w.projects.dapur.name]);
    expect(rows.map((r) => r.condition)).toEqual(['at_risk', 'on_track']);
  });

  it('counts progress over live, non-canceled tasks and explains the condition', async () => {
    const [hajatan] = await getProjects(principalOf(w.me), NOW);
    // 11 counted tasks (the canceled and the trashed one are out), 3 of them done.
    expect(hajatan?.progress).toEqual({ done: 3, total: 11, percent: 27 });
    expect(hajatan?.reason).toBe('1 tugas penting terlambat');
    expect(hajatan?.dueDate).toBe('2026-10-24');
  });

  it('agrees with the Proyek menu for the same project', async () => {
    const menu = await listProjects(principalOf(w.me), {
      scope: 'mine',
      status: 'active',
      limit: 20,
      offset: 0,
      now: NOW,
    });
    const home = await getProjects(principalOf(w.me), NOW);
    for (const h of home) {
      const m = menu.items.find((i) => i.id === h.id);
      expect(h.progress).toEqual(m?.progress as typeof h.progress);
      expect(h.condition).toBe(m?.condition?.level as typeof h.condition);
    }
  });

  it('shows nothing to someone who belongs to no running project', async () => {
    expect(await getProjects(principalOf(w.outsider), NOW)).toEqual([]);
  });

  it('skips projects that are not running or are trashed', async () => {
    const done = await f.project({ lead: w.me, status: 'completed', name: 'Selesai Uji' });
    expect((await getProjects(principalOf(w.me), NOW)).map((r) => r.id)).not.toContain(done.id);
    expect((await getProjects(principalOf(w.me), NOW)).map((r) => r.id)).not.toContain(
      w.projects.arsip.id,
    );
  });

  it('reads the database four times whatever the number of projects', async () => {
    const { exec, queries } = countQueries();
    await getProjects(principalOf(w.me), NOW, exec);
    expect(queries).toHaveLength(4);
  });
});
