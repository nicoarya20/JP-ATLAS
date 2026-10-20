/** Beranda counters: only the projects I manage, the Tugas menu's definitions, and one statement. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { getCounters } from '../../server/home/home.stats.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';
import { type HomeWorld, principalOf, seedHomeWorld } from './home.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hstat' });
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

describe('getCounters', () => {
  it('counts unassigned, in-progress and done tasks of the projects I manage and nothing else', async () => {
    // Hajatan: unassigned 1 (todo, nobody); in progress 3 (overdue, later, Rina's); done 3 (Rina's, last week's, Monday's).
    // Not counted: the canceled task, the trashed done task, Dapur (member only), Terpisah, the trashed project.
    expect(await getCounters(principalOf(w.me))).toEqual({
      unassigned: 1,
      inProgress: 3,
      completed: 3,
      managedProjects: 1,
      memberProjects: 2,
    });
  });

  it('gives a plain member zeros and says how many projects they belong to', async () => {
    expect(await getCounters(principalOf(w.peer))).toEqual({
      unassigned: 0,
      inProgress: 0,
      completed: 0,
      managedProjects: 0,
      memberProjects: 1,
    });
  });

  it('gives someone with no project zeros everywhere', async () => {
    expect(await getCounters(principalOf(w.outsider))).toEqual({
      unassigned: 0,
      inProgress: 0,
      completed: 0,
      managedProjects: 0,
      memberProjects: 0,
    });
  });

  it('reads the database once', async () => {
    const { exec, queries } = countQueries();
    await getCounters(principalOf(w.me), exec);
    expect(queries).toHaveLength(1);
  });
});
