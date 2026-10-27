/**
 * Leave status for the Team menu: "Cuti sampai <tgl>" for a recorded period that covers today.
 * Since P14 there is no second kind and no viewer rule — a leave Admin recorded is a fact every
 * colleague may read (D3) — so what these tests pin is the date arithmetic, the one statement per
 * page, and that the Admin-only note never comes out (D6).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { leaveStatusFor } from '../../server/leave/leave.status.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { CLOCK, type LeaveWorld, leaveWorld, seedLeave } from './leave.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'leavest' });
let w: LeaveWorld;

beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const TODAY: string = CLOCK.today;
const statusOf = async (who: LeaveWorld['dodi'], today: string = TODAY) =>
  (await leaveStatusFor([who.id], today)).get(who.id);

describe('Cuti sampai', () => {
  it('shows a period that covers today, with its last day', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09');
    expect(await statusOf(w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-09' });
  });

  it('counts the first and the last day as on leave', async () => {
    await seedLeave(w.dodi, '2026-10-07', '2026-10-07');
    expect(await statusOf(w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-07' });
    expect(await statusOf(w.dodi, '2026-10-06')).toBeNull();
    expect(await statusOf(w.dodi, '2026-10-08')).toBeNull();
  });

  it('joins back-to-back periods so the person is not shown back a day early', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-08');
    await seedLeave(w.dodi, '2026-10-09', '2026-10-10');
    await seedLeave(w.dodi, '2026-10-12', '2026-10-13');
    expect(await statusOf(w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-10' });
  });

  it('says nothing about a period that has not started or has ended', async () => {
    await seedLeave(w.dodi, '2026-10-08', '2026-10-12');
    await seedLeave(w.eka, '2026-10-01', '2026-10-06');
    expect(await statusOf(w.dodi)).toBeNull();
    expect(await statusOf(w.eka)).toBeNull();
  });

  it('is decided by the injected date, not by the clock', async () => {
    await seedLeave(w.dodi, '2026-12-01', '2026-12-03');
    expect(await statusOf(w.dodi)).toBeNull();
    expect(await statusOf(w.dodi, '2026-12-02')).toEqual({
      kind: 'on_leave',
      until: '2026-12-03',
    });
  });

  it('reads the same for every role: there is no waiting state left to hide (P14 D2/D3)', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09');
    for (const _viewer of [w.dodi, w.eka, w.oki, w.nico, w.lea, w.ayu]) {
      expect(await statusOf(w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-09' });
    }
  });
});

describe('the Admin-only note (P14 D6)', () => {
  it('never leaves the status query, not even as an extra key', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09', 'umroh');
    const status = await statusOf(w.dodi);
    expect(status).toEqual({ kind: 'on_leave', until: '2026-10-09' });
    expect(Object.keys(status ?? {}).sort()).toEqual(['kind', 'until']);
    expect(JSON.stringify(status)).not.toInclude('umroh');
  });
});

describe('a page of people', () => {
  it('answers for everybody asked about in one statement, null where there is nothing to show', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09');
    await seedLeave(w.eka, '2026-10-14', '2026-10-15');
    const counter = countQueries();
    const people = [w.dodi, w.eka, w.oki, w.nico, w.lea, w.ayu];
    const map = await leaveStatusFor(
      people.map((p) => p.id),
      TODAY,
      counter.exec,
    );
    expect(counter.queries).toHaveLength(1);
    expect([...map.keys()].sort()).toEqual(people.map((p) => p.id).sort());
    expect(map.get(w.dodi.id)).toEqual({ kind: 'on_leave', until: '2026-10-09' });
    // Eka's period has not started: present in the map, but nothing to show.
    expect(map.get(w.eka.id)).toBeNull();
    for (const none of [w.oki, w.nico, w.lea, w.ayu]) expect(map.get(none.id)).toBeNull();
  });

  it('asks nothing when nobody is asked about', async () => {
    const counter = countQueries();
    const map = await leaveStatusFor([], TODAY, counter.exec);
    expect(map.size).toBe(0);
    expect(counter.queries).toHaveLength(0);
  });
});
