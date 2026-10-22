/** Tasks Completed This Week: Monday 00.00 in the team zone is the line, and only my projects count. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { dayLabelOf, getDone } from '../../server/home/home.done.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { type HomeWorld, principalOf, seedHomeWorld, TODAY } from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hdone' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

const clock = { today: TODAY, timeZone: 'Asia/Jakarta' }; // test-only

describe('getDone', () => {
  it('lists this week newest first, naming who did it and when', async () => {
    const { items, total } = await getDone(principalOf(w.me), clock);
    expect(total).toBe(3);
    expect(items.map((i) => [i.title, i.byName, i.dayLabel])).toEqual([
      ['Ukur dapur', 'Budi Uji', 'hari ini'],
      ['Survei harga', 'Rina Uji', 'kemarin'],
      ['Senin pagi', 'Anda', 'Senin'],
    ]);
  });

  it('puts the line at Monday 00.00 WIB: 23.59 on Sunday is last week, 00.00 is this week', async () => {
    const titles = (await getDone(principalOf(w.me), clock)).items.map((i) => i.title);
    expect(titles).toContain('Senin pagi');
    expect(titles).not.toContain('Minggu lalu');
  });

  it('leaves out other projects, trashed tasks and unfinished ones', async () => {
    const titles = (await getDone(principalOf(w.me), clock)).items.map((i) => i.title);
    expect(titles).not.toContain('Rahasia selesai');
    expect(titles).not.toContain('Sudah dibuang');
    expect(titles).not.toContain('Bayar DP');
  });

  it('shows a task nobody was assigned to as such', async () => {
    const orphan = await f.task({
      project: w.projects.dapur,
      status: 'done',
      completedAt: new Date('2026-10-07T01:00:00Z'),
      title: 'Tanpa pengerja selesai',
    });
    const row = (await getDone(principalOf(w.me), clock)).items.find((i) => i.id === orphan.id);
    expect(row?.byName).toBe('Belum ada pengerja');
  });

  it('is empty for someone with no project', async () => {
    expect(await getDone(principalOf(w.outsider), clock)).toEqual({ items: [], total: 0 });
  });

  it('reads the database once', async () => {
    const { exec, queries } = countQueries();
    await getDone(principalOf(w.me), clock, exec);
    expect(queries).toHaveLength(1);
  });
});

describe('dayLabelOf', () => {
  it.each([
    ['2026-10-07', 'hari ini'],
    ['2026-10-06', 'kemarin'],
    ['2026-10-05', 'Senin'],
    ['2026-10-04', 'Minggu'],
  ])('labels %s as %s when today is 2026-10-07', (day, label) => {
    expect(dayLabelOf(day, TODAY)).toBe(label);
  });
});
