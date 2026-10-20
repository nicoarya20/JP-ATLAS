/** Trash visibility (S1-18): who sees a trashed project and who gets the restore button, per role. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { canViewTrashItem, trashItemCaps, trashListScope } from '../../server/access/trash.policy';
import type { Principal, ProjectSubject } from '../../server/access/types';
import { lastRestorableDate } from '../../server/metrics/trash.metrics';
import type { Role } from '../../server/permissions';
import { toPrincipal } from '../../server/project/membership.query';
import { listTrashProjects } from '../../server/project/project-trash.query';
import { trashProject } from '../../server/project/project-trash.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-10-07T03:00:00Z'); // test-only
const as = (u: TestUser, role: Role = u.role): Principal => toPrincipal({ user: u, role });

describe('lastRestorableDate', () => {
  it('counts the day of deletion as day 1 of 30', () => {
    expect(lastRestorableDate('2026-10-07')).toBe('2026-11-05');
    expect(lastRestorableDate('2026-12-15')).toBe('2027-01-13');
  });

  it('rejects text that is not a date', () => {
    expect(() => lastRestorableDate('kemarin')).toThrow('Invalid ISO date');
  });
});

describe('trash policy (pure)', () => {
  const trashed: ProjectSubject = {
    id: 'p1',
    status: 'active',
    leadId: 'lead',
    deletedAt: NOW,
    deletedBy: 'deleter',
  };
  const who = (id: string, appRole: Role, impersonating = false): Principal => ({
    id,
    appRole,
    impersonating,
  });
  const manager = { role: 'manager', joinedAt: NOW } as const;
  const member = { role: 'member', joinedAt: NOW } as const;
  const viewer = { role: 'viewer', joinedAt: NOW } as const;

  // [case, principal, membership, sees it, restore cap]
  it.each([
    ['super-admin, not a member', who('sa', 'super-admin'), null, true, true],
    ['admin, not a member', who('ad', 'admin'), null, true, true],
    ['PM who deleted it', who('deleter', 'project_manager'), manager, true, true],
    ['PM-manager who did not delete it', who('pm', 'project_manager'), manager, true, true],
    ['PM, not a member', who('pm', 'project_manager'), null, false, undefined],
    ['Member-manager', who('mm', 'member'), manager, true, true],
    ['member of the project', who('m', 'member'), member, false, undefined],
    ['viewer of the project', who('v', 'member'), viewer, false, undefined],
    ['member outside the project', who('x', 'member'), null, false, undefined],
    ['deleter who has since left', who('deleter', 'member'), null, true, undefined],
  ] as const)('%s', (_case, p, m, sees, restore) => {
    expect(canViewTrashItem(p, trashed, m, NOW).ok).toBe(sees);
    if (sees) expect(trashItemCaps(p, trashed, m, NOW).restore).toBe(restore);
  });

  it('keeps an expired item listed with the button off, and shows impersonation as off', () => {
    const late = new Date(NOW.getTime() + 30 * DAY_MS);
    expect(canViewTrashItem(who('mm', 'member'), trashed, manager, late).ok).toBe(true);
    expect(trashItemCaps(who('mm', 'member'), trashed, manager, late).restore).toBe('EXPIRED');
    const acting = who('sa', 'super-admin', true);
    expect(canViewTrashItem(acting, trashed, null, NOW).ok).toBe(true);
    expect(trashItemCaps(acting, trashed, null, NOW).restore).toBe('IMPERSONATING');
  });

  it('never treats a live project as a Trash item', () => {
    expect(
      canViewTrashItem(who('ad', 'admin'), { ...trashed, deletedAt: null }, null, NOW).ok,
    ).toBe(false);
  });

  it('scopes the list to all for Admin and Super-admin only', () => {
    expect(trashListScope(who('ad', 'admin'))).toEqual({ kind: 'all' });
    expect(trashListScope(who('sa', 'super-admin'))).toEqual({ kind: 'all' });
    expect(trashListScope(who('pm', 'project_manager'))).toEqual({
      kind: 'deletedByOrManaged',
      userId: 'pm',
    });
  });
});

describe('listTrashProjects (SQL matches the policy)', () => {
  const cleaner = createCleaner();
  const f = createFactory(cleaner, { tag: 'trashvis' });
  afterEach(() => cleaner.flushTest());
  afterAll(() => cleaner.flushAll());

  type Cast = Record<string, TestUser>;
  let cast: Cast;
  let projectId = '';

  beforeAll(() => cleaner.shared(seed));

  async function seed() {
    const lead = await f.user({ role: 'project_manager' });
    cast = {
      lead,
      pmManager: await f.user({ role: 'project_manager' }),
      pmOutside: await f.user({ role: 'project_manager' }),
      memberManager: await f.user(),
      member: await f.user(),
      viewer: await f.user(),
      outsider: await f.user(),
      admin: await f.user({ role: 'admin' }),
    };
    const prj = await f.project({
      lead,
      members: [
        [cast.pmManager as TestUser, 'manager'],
        [cast.memberManager as TestUser, 'manager'],
        [cast.member as TestUser, 'member'],
        [cast.viewer as TestUser, 'viewer'],
      ],
    });
    projectId = prj.id;
    await f.task({ project: prj });
    const r = await trashProject(as(lead), prj.id, NOW);
    expect(r.ok).toBe(true);
  }

  const page = (u: TestUser) =>
    listTrashProjects(as(u), { limit: 50, offset: 0, now: NOW }).then((r) =>
      r.items.filter((i) => i.id === projectId),
    );

  it.each([
    ['lead', true],
    ['pmManager', true],
    ['memberManager', true],
    ['admin', true],
    ['pmOutside', false],
    ['member', false],
    ['viewer', false],
    ['outsider', false],
  ])('%s sees it: %p', async (name, sees) => {
    const items = await page(cast[name] as TestUser);
    expect(items).toHaveLength(sees ? 1 : 0);
  });

  it('names the deleter, dates the restore limit on the server and sends can.restore', async () => {
    const [item] = await page(cast.memberManager as TestUser);
    expect(item).toEqual({
      kind: 'project',
      id: projectId,
      name: expect.any(String),
      deletedAt: NOW.toISOString(),
      deletedBy: { id: (cast.lead as TestUser).id, name: (cast.lead as TestUser).name },
      restorableUntil: '2026-11-05',
      daysLeft: 30, // deleted today, 30 days to go
      cascade: { tasks: expect.any(Number), events: 0 },
      can: { restore: true },
    });
  });
});
