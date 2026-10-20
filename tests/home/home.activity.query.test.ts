/** Latest Activity: sentences in Indonesian, only my projects, newest first, two statements. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { activitySentence, whoLabel } from '../../server/home/home.activity';
import { getActivity } from '../../server/home/home.activity.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import {
  addActivity,
  addComment,
  type HomeWorld,
  hoursAgo,
  principalOf,
  seedHomeWorld,
} from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hact' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
  const t = w.tasks;
  await addActivity(t.overdue.id, w.me, 'completed', hoursAgo(1));
  await addComment(t.dapurToday.id, w.boss, hoursAgo(3));
  await addActivity(t.peerBusy.id, w.peer, 'started', hoursAgo(5));
  // Never shown: history of a project I am not in, of a trashed task, a removed comment and a removed-comment note.
  await addActivity(t.hidden.id, w.boss, 'completed', hoursAgo(0.5));
  await addActivity(t.trashed.id, w.peer, 'completed', hoursAgo(0.4));
  await addComment(t.week.id, w.peer, hoursAgo(0.3), hoursAgo(0.2));
  await addActivity(t.week.id, w.peer, 'comment.delete', hoursAgo(0.1));
});

describe('getActivity', () => {
  it('writes who did what, newest first, with "Anda" for me', async () => {
    const items = await getActivity(principalOf(w.me));
    expect(items.map((i) => i.text)).toEqual([
      'Anda menyelesaikan "Bayar DP"',
      'Budi Uji menambah catatan di "Beli keramik"',
      'Rina Uji mulai mengerjakan "Pekerjaan Rina"',
    ]);
    expect(items.map((i) => i.projectName)).toEqual([
      w.projects.hajatan.name,
      w.projects.dapur.name,
      w.projects.hajatan.name,
    ]);
    expect(items.map((i) => i.taskNumber)).toEqual([
      w.tasks.overdue.number,
      w.tasks.dapurToday.number,
      w.tasks.peerBusy.number,
    ]);
  });

  it('hides other projects, trashed tasks, removed comments and comment bookkeeping', async () => {
    const texts = (await getActivity(principalOf(w.me))).map((i) => i.text).join('|');
    expect(texts).not.toContain('Bukan urusan saya');
    expect(texts).not.toContain('Sudah dibuang');
    expect(texts).not.toContain('Beli cat');
  });

  it('is empty for someone with no project', async () => {
    expect(await getActivity(principalOf(w.outsider))).toEqual([]);
  });

  it('keeps at most five rows', async () => {
    for (let i = 0; i < 7; i++)
      await addActivity(w.tasks.overdue.id, w.me, 'started', hoursAgo(10 + i));
    expect(await getActivity(principalOf(w.me))).toHaveLength(5);
  });

  it('reads the database twice', async () => {
    const { exec, queries } = countQueries();
    await getActivity(principalOf(w.me), exec);
    expect(queries).toHaveLength(2);
  });
});

describe('activitySentence and whoLabel', () => {
  it('has a sentence per known action and a safe one for an unknown action', () => {
    expect(activitySentence('due_date_changed', 'Rina', 'Beli cat')).toBe(
      'Rina mengubah tenggat "Beli cat"',
    );
    expect(activitySentence('sesuatu.baru', 'Rina', 'Beli cat')).toBe('Rina mengubah "Beli cat"');
    // Prototype keys must not resolve to a sentence.
    expect(activitySentence('constructor', 'Rina', 'Beli cat')).toBe('Rina mengubah "Beli cat"');
  });

  it('names me, a live account, a renamed one, a stranger and a removed account', () => {
    expect(whoLabel('u1', 'u1', 'Nico', null)).toBe('Anda');
    expect(whoLabel('u1', 'u2', 'Rina', 'Rina Lama')).toBe('Rina');
    expect(whoLabel('u1', 'u2', null, 'Rina Lama')).toBe('Rina Lama');
    expect(whoLabel('u1', 'u2', null, null)).toBe('Seseorang');
    expect(whoLabel('u1', null, null, 'Rina Lama')).toBe('Mantan anggota');
  });
});
