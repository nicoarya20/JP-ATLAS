/**
 * Leave status for the Team menu: "Cuti sampai <tgl>" (approved, covers today, seen by everyone) and
 * "Pengajuan cuti <rentang>" (pending, seen by the owner, Project Managers and Admins). "Today" is
 * injected and the whole page is one statement.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { leaveStatusFor } from '../../server/leave/leave.status.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { asPrincipal, CLOCK, type LeaveWorld, leaveWorld, seedLeave } from './leave.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'leavest' });
let w: LeaveWorld;

beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const TODAY = CLOCK.today;
const statusOf = async (viewer: LeaveWorld['dodi'], who: LeaveWorld['dodi'], today = TODAY) =>
  (await leaveStatusFor([who.id], asPrincipal(viewer), today)).get(who.id);

describe('Cuti sampai', () => {
  it('shows an approved leave that covers today to everyone, with its last day', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09', 'approved');
    for (const viewer of [w.dodi, w.eka, w.oki, w.nico, w.ayu]) {
      expect(await statusOf(viewer, w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-09' });
    }
  });

  it('counts the first and the last day as on leave', async () => {
    await seedLeave(w.dodi, '2026-10-07', '2026-10-07', 'approved');
    expect(await statusOf(w.eka, w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-07' });
    expect(await statusOf(w.eka, w.dodi, '2026-10-06')).toBeNull();
    expect(await statusOf(w.eka, w.dodi, '2026-10-08')).toBeNull();
  });

  it('joins back-to-back approved ranges so the person is not shown back a day early', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-08', 'approved');
    await seedLeave(w.dodi, '2026-10-09', '2026-10-10', 'approved');
    await seedLeave(w.dodi, '2026-10-12', '2026-10-13', 'approved');
    expect(await statusOf(w.eka, w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-10' });
  });

  it('says nothing about an approved leave that has not started or has ended', async () => {
    await seedLeave(w.dodi, '2026-10-08', '2026-10-12', 'approved');
    await seedLeave(w.eka, '2026-10-01', '2026-10-06', 'approved');
    expect(await statusOf(w.nico, w.dodi)).toBeNull();
    expect(await statusOf(w.nico, w.eka)).toBeNull();
  });

  it('ignores rejected and canceled requests', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09', 'rejected');
    await seedLeave(w.eka, '2026-10-05', '2026-10-09', 'canceled');
    expect(await statusOf(w.ayu, w.dodi)).toBeNull();
    expect(await statusOf(w.ayu, w.eka)).toBeNull();
  });

  it('is decided by the injected date, not by the clock', async () => {
    await seedLeave(w.dodi, '2026-12-01', '2026-12-03', 'approved');
    expect(await statusOf(w.eka, w.dodi)).toBeNull();
    expect(await statusOf(w.eka, w.dodi, '2026-12-02')).toEqual({
      kind: 'on_leave',
      until: '2026-12-03',
    });
  });
});

describe('Pengajuan cuti', () => {
  it('shows a waiting request to its owner, Project Managers and Admins, with its range', async () => {
    await seedLeave(w.dodi, '2026-10-14', '2026-10-16', 'pending');
    for (const viewer of [w.dodi, w.nico, w.lea, w.ayu]) {
      expect(await statusOf(viewer, w.dodi)).toEqual({
        kind: 'pending',
        from: '2026-10-14',
        to: '2026-10-16',
      });
    }
  });

  it('hides it from other Members, a Member-Pengelola included', async () => {
    await seedLeave(w.dodi, '2026-10-14', '2026-10-16', 'pending');
    expect(await statusOf(w.eka, w.dodi)).toBeNull();
    expect(await statusOf(w.oki, w.dodi)).toBeNull();
  });

  it('prefers leave under way over a later request, and the soonest request over a later one', async () => {
    await seedLeave(w.dodi, '2026-10-06', '2026-10-08', 'approved');
    await seedLeave(w.dodi, '2026-10-20', '2026-10-21', 'pending');
    expect(await statusOf(w.nico, w.dodi)).toEqual({ kind: 'on_leave', until: '2026-10-08' });
    await seedLeave(w.eka, '2026-11-20', '2026-11-21', 'pending');
    await seedLeave(w.eka, '2026-10-20', '2026-10-21', 'pending');
    expect(await statusOf(w.nico, w.eka)).toEqual({
      kind: 'pending',
      from: '2026-10-20',
      to: '2026-10-21',
    });
  });

  it('forgets a request whose last day has passed', async () => {
    await seedLeave(w.dodi, '2026-10-01', '2026-10-06', 'pending');
    expect(await statusOf(w.nico, w.dodi)).toBeNull();
  });
});

describe('a page of people', () => {
  it('answers for everybody asked about in one statement, null where there is nothing to show', async () => {
    await seedLeave(w.dodi, '2026-10-05', '2026-10-09', 'approved');
    await seedLeave(w.eka, '2026-10-14', '2026-10-15', 'pending');
    const counter = countQueries();
    const people = [w.dodi, w.eka, w.oki, w.nico, w.lea, w.ayu];
    const map = await leaveStatusFor(
      people.map((p) => p.id),
      asPrincipal(w.nico),
      TODAY,
      counter.exec,
    );
    expect(counter.queries).toHaveLength(1);
    expect([...map.keys()].sort()).toEqual(people.map((p) => p.id).sort());
    expect(map.get(w.dodi.id)).toEqual({ kind: 'on_leave', until: '2026-10-09' });
    expect(map.get(w.eka.id)).toEqual({ kind: 'pending', from: '2026-10-14', to: '2026-10-15' });
    for (const none of [w.oki, w.nico, w.lea, w.ayu]) expect(map.get(none.id)).toBeNull();
  });

  it('asks nothing when nobody is asked about', async () => {
    const counter = countQueries();
    const map = await leaveStatusFor([], asPrincipal(w.nico), TODAY, counter.exec);
    expect(map.size).toBe(0);
    expect(counter.queries).toHaveLength(0);
  });

  it('shows a Member only their own waiting request out of a page', async () => {
    await seedLeave(w.dodi, '2026-10-14', '2026-10-15', 'pending');
    await seedLeave(w.eka, '2026-10-14', '2026-10-15', 'pending');
    const map = await leaveStatusFor([w.dodi.id, w.eka.id], asPrincipal(w.dodi), TODAY);
    expect(map.get(w.dodi.id)).toMatchObject({ kind: 'pending' });
    expect(map.get(w.eka.id)).toBeNull();
  });
});
