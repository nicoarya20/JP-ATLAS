/** Agenda of the Beranda: what is on or still running, split into today and tomorrow by the team zone. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { getAgenda } from '../../server/home/home.agenda.query';
import { createEventFactory } from '../event/factory.event';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { type HomeWorld, NOW, principalOf, seedHomeWorld, TODAY } from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hagn' });
const events = createEventFactory({ tag: 'hagn-e', now: () => NOW });
afterEach(() => events.flush());
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

const clock = { now: NOW, today: TODAY, timeZone: 'Asia/Jakarta' }; // test-only

describe('getAgenda', () => {
  it('marks what is today and what is tomorrow, soonest first', async () => {
    const later = await events.event({ creator: w.me, project: null, startsInMin: 60 });
    const tomorrow = await events.event({ creator: w.me, project: null, startsInMin: 60 * 24 });
    const items = await getAgenda(principalOf(w.me), clock);
    expect(items.map((i) => [i.id, i.day])).toEqual([
      [later.id, 'today'],
      [tomorrow.id, 'tomorrow'],
    ]);
  });

  it('keeps a meeting in progress as today and drops one that already ended', async () => {
    const running = await events.event({ creator: w.me, project: null, startsInMin: -30 });
    const over = await events.event({
      creator: w.me,
      project: null,
      startsInMin: -120,
      durationMin: 60,
    });
    const ids = (await getAgenda(principalOf(w.me), clock)).map((i) => i.id);
    expect(ids).toContain(running.id);
    expect(ids).not.toContain(over.id);
  });

  it('shows only events I made or was invited to', async () => {
    const theirs = await events.event({
      creator: w.boss,
      project: w.projects.dapur,
      startsInMin: 90,
      guests: [],
    });
    expect((await getAgenda(principalOf(w.peer), clock)).map((i) => i.id)).not.toContain(theirs.id);
  });

  it('carries the project of the event', async () => {
    const e = await events.event({ creator: w.me, project: w.projects.hajatan, startsInMin: 45 });
    const row = (await getAgenda(principalOf(w.me), clock)).find((i) => i.id === e.id);
    expect(row?.project).toEqual({ id: w.projects.hajatan.id, name: w.projects.hajatan.name });
  });

  it('is empty when nothing is planned', async () => {
    expect(await getAgenda(principalOf(w.outsider), clock)).toEqual([]);
  });
});
