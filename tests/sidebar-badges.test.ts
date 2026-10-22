/** /dev sidebar counters: one badge per menu, sane tones, short-lived cache. */
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../server/db';
import { adminSidebarBadges, devSidebarBadges, usersBadge } from '../server/sidebar-badges';
import { testUser } from './support/accounts';

describe('devSidebarBadges', () => {
  test('returns a numeric badge with tooltip and tone for every console menu it covers', async () => {
    const badges = await devSidebarBadges({ fresh: true });
    const expected = [
      '/dev/users',
      '/dev/sessions',
      '/dev/posts',
      '/dev/api-keys',
      '/dev/db-schema',
      '/dev/visits',
      '/dev/login-logs',
      '/dev/rate-limit-logs',
      '/dev/server-logs',
      '/dev/audit',
      '/dev/settings',
      '/dev/tools',
    ];
    for (const route of expected) {
      const b = badges[route];
      expect(b).toBeDefined();
      expect(Number.isInteger(b.value) && b.value >= 0).toBe(true);
      expect(b.tone === 'alert' || b.tone === 'info').toBe(true);
      if (b.value > 0) expect(b.tooltip).toBeTruthy();
    }
    // Attention badges carry a color; scale badges are gray.
    expect(badges['/dev/rate-limit-logs'].color).toBe('red');
    expect(badges['/dev/db-schema'].color).toBe('red');
    expect(badges['/dev/users'].color === 'gray' || badges['/dev/users'].color === 'orange').toBe(
      true,
    );
    expect(badges['/dev/visits'].tone).toBe('info');
  });
  test('the settings badge no longer counts demo users (feature retired in S0A-13)', async () => {
    const tip = (await devSidebarBadges({ fresh: true }))['/dev/settings'].tooltip ?? '';
    expect(tip.toLowerCase()).not.toContain('demo');
  });
  test('serves the same promise within the cache window', async () => {
    const a = devSidebarBadges();
    const b = devSidebarBadges();
    expect(a).toBe(b);
    expect(await devSidebarBadges({ fresh: true })).not.toBe(await a);
  });
});

describe('pending approvals badge (S0A-16)', () => {
  const created: string[] = [];
  afterEach(async () => {
    for (const id of created.splice(0)) await db.delete(schema.user).where(eq(schema.user.id, id));
  });
  const seed = async (overrides: Parameters<typeof testUser>[0]) => {
    const row = testUser(overrides);
    await db.insert(schema.user).values(row);
    created.push(row.id as string);
  };

  test('usersBadge: pending outranks blocked and names the queue in Indonesian', () => {
    const b = usersBadge({ total: 10, banned: 2, pending: 3 });
    expect(b).toMatchObject({ value: 3, tone: 'alert', color: 'orange' });
    expect(b.tooltip).toBe('3 akun menunggu persetujuan');
  });

  test('usersBadge: nothing pending keeps the previous blocked/total behavior', () => {
    expect(usersBadge({ total: 10, banned: 2, pending: 0 })).toMatchObject({
      value: 2,
      tone: 'alert',
      tooltip: '2 user sedang diblokir',
    });
    expect(usersBadge({ total: 10, banned: 0, pending: 0 })).toMatchObject({
      value: 10,
      tone: 'info',
      color: 'gray',
    });
  });

  test('a new pending account raises /dev/users and the approval queue link by one', async () => {
    const before = (await adminSidebarBadges())['/dashboard/users']?.value ?? 0;
    await seed({ approvalStatus: 'pending' });
    const badges = await devSidebarBadges({ fresh: true });
    expect(badges['/dev/users']).toMatchObject({ value: before + 1, tone: 'alert' });
    expect(badges['/dev/users'].tooltip).toContain('menunggu persetujuan');
    expect(badges['/dashboard/users']).toMatchObject({ value: before + 1, tone: 'alert' });
  });

  test('anonymous and approved accounts are not counted as pending', async () => {
    const before = (await adminSidebarBadges())['/dashboard/users']?.value ?? 0;
    await seed({ approvalStatus: 'pending', isAnonymous: true });
    await seed({ approvalStatus: 'approved' });
    expect((await adminSidebarBadges())['/dashboard/users']?.value ?? 0).toBe(before);
  });

  test('adminSidebarBadges only reports the queue and is fresh on every call', async () => {
    await seed({ approvalStatus: 'pending' });
    const first = await adminSidebarBadges();
    expect(Object.keys(first)).toEqual(['/dashboard/users']);
    await db
      .update(schema.user)
      .set({ approvalStatus: 'approved' })
      .where(eq(schema.user.id, created[0]));
    const after = (await adminSidebarBadges())['/dashboard/users']?.value ?? 0;
    expect(after).toBe(first['/dashboard/users'].value - 1);
  });

  test('a failing source degrades to no badge instead of throwing', async () => {
    const spy = spyOn(db, 'select').mockImplementation(() => {
      throw new Error('db down'); // test-only
    });
    try {
      expect(await adminSidebarBadges()).toEqual({});
      const dev = await devSidebarBadges({ fresh: true });
      expect(dev['/dashboard/users']).toBeUndefined();
      expect(dev['/dev/users']).toMatchObject({ value: 0 });
    } finally {
      spy.mockRestore();
    }
  });
});
