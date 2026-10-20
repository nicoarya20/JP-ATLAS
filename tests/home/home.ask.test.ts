/** Ask Data without a model: the three answers say only what their numbers say, and the facts come from one statement each. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { composeAsk } from '../../server/home/home.ask';
import { getBusiest, getLongestOverdue } from '../../server/home/home.ask.query';
import type { HomeProject } from '../../server/home/home.dto';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { type HomeWorld, principalOf, seedHomeWorld, TODAY } from './home.world';

const project = (over: Partial<HomeProject> & Pick<HomeProject, 'name'>): HomeProject => ({
  id: over.name,
  dueDate: null,
  progress: { done: 0, total: 0, percent: null },
  condition: 'on_track',
  reason: null,
  ...over,
});

const NONE = { projects: [], overdue: null, busiest: [], today: TODAY };

describe('composeAsk', () => {
  it('offers the three questions in a fixed order', () => {
    expect(composeAsk(NONE).map((a) => a.key)).toEqual(['behind', 'stalled', 'busiest']);
  });

  it('answers calmly when there is nothing to compare', () => {
    const [behind, stalled, busiest] = composeAsk(NONE);
    expect(behind?.answer).toBe('Belum ada proyek berjalan untuk dibandingkan.');
    expect(stalled?.answer).toBe('Tidak ada tugas yang terlambat. Semua sesuai jadwal.');
    expect(busiest?.answer).toBe('Belum ada tugas aktif yang punya penanggung jawab.');
    expect([behind, stalled, busiest].every((a) => a?.bars.length === 0)).toBe(true);
  });

  it('names the project most behind by condition first, then progress, with its due date', () => {
    const [behind] = composeAsk({
      ...NONE,
      projects: [
        project({ name: 'Arisan', progress: { done: 9, total: 10, percent: 90 } }),
        project({
          name: 'Hajatan',
          condition: 'at_risk',
          dueDate: '2026-10-23',
          progress: { done: 4, total: 10, percent: 40 },
        }),
        project({ name: 'Dapur', progress: { done: 7, total: 10, percent: 70 } }),
      ],
    });
    expect(behind?.answer).toBe(
      'Hajatan paling tertinggal: baru 4 dari 10 tugas selesai, tenggat tinggal 16 hari.',
    );
    expect(behind?.bars).toEqual([
      { label: 'Arisan', pct: 90, display: '90%' },
      { label: 'Hajatan', pct: 40, display: '40%' },
      { label: 'Dapur', pct: 70, display: '70%' },
    ]);
  });

  it('says a due date already past, and skips projects that have no tasks yet', () => {
    const [behind] = composeAsk({
      ...NONE,
      projects: [
        project({ name: 'Kosong' }),
        project({
          name: 'Telat',
          condition: 'off_track',
          dueDate: '2026-10-05',
          progress: { done: 1, total: 4, percent: 25 },
        }),
      ],
    });
    expect(behind?.answer).toContain('Telat paling tertinggal');
    expect(behind?.answer).toContain('tenggatnya sudah lewat 2 hari');
    expect(behind?.bars[0]).toEqual({ label: 'Kosong', pct: 0, display: 'Belum ada tugas' });
  });

  it('does not judge a project without tasks', () => {
    const [behind] = composeAsk({ ...NONE, projects: [project({ name: 'Kosong' })] });
    expect(behind?.answer).toBe('Kosong belum punya tugas, jadi belum bisa dinilai.');
  });

  it('names the task overdue longest and how many days', () => {
    const [, stalled] = composeAsk({
      ...NONE,
      overdue: { title: 'Bayar DP', projectName: 'Hajatan', dueDate: '2026-10-05' },
    });
    expect(stalled?.answer).toBe('"Bayar DP" (Hajatan) sudah lewat 2 hari dan belum selesai.');
  });

  it('names who carries most open tasks and scales the bars to them', () => {
    const [, , busiest] = composeAsk({
      ...NONE,
      busiest: [
        { name: 'Rina', open: 6 },
        { name: 'Dodi', open: 3 },
      ],
    });
    expect(busiest?.answer).toBe('Rina paling banyak tugas: 6 tugas aktif.');
    expect(busiest?.bars).toEqual([
      { label: 'Rina', pct: 100, display: '6 tugas' },
      { label: 'Dodi', pct: 50, display: '3 tugas' },
    ]);
  });
});

describe('Ask Data facts', () => {
  const cleaner = createCleaner();
  const f = createFactory(cleaner, { tag: 'hask' });
  afterAll(() => cleaner.flushAll());
  let w: HomeWorld;
  beforeAll(async () => {
    w = await seedHomeWorld(f, cleaner);
  });

  it('finds the open task overdue longest in my projects and none in other projects or the trash', async () => {
    const fact = await getLongestOverdue(principalOf(w.me), TODAY);
    // The Terpisah task (2026-10-01) and the trashed project's one are older, but not mine to see.
    expect(fact).toEqual({
      title: 'Bayar DP',
      projectName: w.projects.hajatan.name,
      dueDate: '2026-10-05',
    });
    expect(await getLongestOverdue(principalOf(w.outsider), TODAY)).toBeNull();
  });

  it('ranks people by open tasks in my projects', async () => {
    const people = await getBusiest(principalOf(w.me));
    // Nico has six open tasks of his own across Hajatan and Dapur, Rina one.
    expect(people).toEqual([
      { name: 'Nico Uji', open: 7 },
      { name: 'Rina Uji', open: 1 },
    ]);
    expect(await getBusiest(principalOf(w.outsider))).toEqual([]);
  });

  it('reads the database once per fact', async () => {
    const a = countQueries();
    await getLongestOverdue(principalOf(w.me), TODAY, a.exec);
    const b = countQueries();
    await getBusiest(principalOf(w.me), b.exec);
    expect([a.queries.length, b.queries.length]).toEqual([1, 1]);
  });
});
