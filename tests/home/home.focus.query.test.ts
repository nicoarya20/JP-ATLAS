/** My Focus: urgency order, the totals the briefing reads, the row button the policy allows, review rows. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { getFocus } from '../../server/home/home.focus.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { type HomeWorld, principalOf, seedHomeWorld, TODAY } from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hfoc' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

const clock = { today: TODAY };

describe('getFocus', () => {
  it('lists the most urgent tasks first: overdue, today by priority, then the week, five at most', async () => {
    const focus = await getFocus(principalOf(w.me), clock);
    expect(focus.items.map((i) => i.title)).toEqual([
      'Bayar DP',
      'Konfirmasi tenda',
      'Pesan katering',
      'Beli keramik',
      'Beli cat',
    ]);
    expect(focus.items.map((i) => i.group)).toEqual(['overdue', 'today', 'today', 'today', 'week']);
  });

  it('counts every task of mine that qualifies, not just the five shown', async () => {
    const focus = await getFocus(principalOf(w.me), clock);
    // Seven: the five above plus the one due on the 20th and the one without a due date.
    expect(focus.total).toBe(7);
    expect(focus.overdueTotal).toBe(1);
    expect(focus.todayTotal).toBe(3);
  });

  it('says how long the overdue task has been late', async () => {
    const [first] = (await getFocus(principalOf(w.me), clock)).items;
    expect(first?.overdueDays).toBe(2);
    expect(first?.project.name).toBe(w.projects.hajatan.name);
  });

  it('leaves out other people, other projects, review, finished, canceled and trashed work', async () => {
    const titles = (await getFocus(principalOf(w.me), clock)).items.map((i) => i.title);
    for (const gone of [
      'Pekerjaan Rina',
      'Bukan urusan saya',
      'Di proyek terbuang',
      'Dibatalkan',
    ]) {
      expect(titles).not.toContain(gone);
    }
  });

  it('offers "Selesai" on work I may finish', async () => {
    const { items } = await getFocus(principalOf(w.me), clock);
    expect(items.every((i) => i.action === 'complete')).toBe(true);
  });

  it('offers only "Mulai" when the task has to be reviewed before it can be finished', async () => {
    const reviewed = await f.task({
      project: w.projects.hajatan,
      assignee: w.peer,
      needsReview: true,
      due: '2026-10-01',
      title: 'Perlu diperiksa',
    });
    const { items } = await getFocus(principalOf(w.peer), clock);
    const row = items.find((i) => i.id === reviewed.id);
    expect(row?.action).toBe('start');
  });

  it('shows nothing for someone with no tasks', async () => {
    const focus = await getFocus(principalOf(w.outsider), clock);
    expect(focus).toEqual({
      items: [],
      total: 0,
      overdueTotal: 0,
      todayTotal: 0,
      awaitingReview: [],
      awaitingReviewTotal: 0,
    });
  });

  it('lists tasks waiting for my review, and only mine', async () => {
    const waiting = await f.task({
      project: w.projects.hajatan,
      assignee: w.peer,
      reviewer: w.me,
      status: 'in_review',
      title: 'Menunggu saya',
    });
    await f.task({
      project: w.projects.hajatan,
      assignee: w.peer,
      reviewer: w.boss,
      status: 'in_review',
      title: 'Menunggu orang lain',
    });
    const mine = await getFocus(principalOf(w.me), clock);
    expect(mine.awaitingReview.map((r) => r.id)).toEqual([waiting.id]);
    expect(mine.awaitingReviewTotal).toBe(1);
    expect((await getFocus(principalOf(w.boss), clock)).awaitingReview).toHaveLength(0);
  });

  it('reads the database three times however many tasks there are', async () => {
    const { exec, queries } = countQueries();
    await getFocus(principalOf(w.me), clock, exec);
    expect(queries).toHaveLength(3);
  });
});
