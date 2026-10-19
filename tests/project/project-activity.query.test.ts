/** Activity feed query (S5a-03): keyset paging across equal and sub-millisecond timestamps, names, visibility. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';
import { encodeCursor } from '../../server/pm/keyset';
import { toPrincipal } from '../../server/project/membership.query';
import { listProjectActivity } from '../../server/project/project-activity.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'actq' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
const ROWS = 23;
const PAGE = 5;

async function setup() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const outsider = await f.user();
  const prj = await f.project({ lead, members: [[member, 'member']] });
  return { lead, member, outsider, prj };
}

/** Inserts rows whose timestamps differ by microseconds and, in pairs, not at all: the worst case for a keyset. */
async function seedActivity(projectId: string, actorId: string, actorName: string) {
  for (let i = 0; i < ROWS; i++) {
    const micros = Math.floor(i / 2) * 7; // pairs share one instant
    await db.execute(sql`
      insert into project_activity (id, project_id, actor_id, actor_name, action, payload, created_at)
      values (${`${projectId}-a${String(i).padStart(2, '0')}`}, ${projectId}, ${actorId}, ${actorName}, 'updated', '{}'::jsonb,
        timestamptz '2030-10-15 10:00:00.123000+00' + (${micros} * interval '1 microsecond'))`);
  }
}

describe('listProjectActivity', () => {
  it('walks every row exactly once, newest first, across pages', async () => {
    const { lead, prj } = await setup();
    await seedActivity(prj.id, lead.id, lead.name);
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < ROWS; guard++) {
      const r = await listProjectActivity(principal(lead), prj.id, { limit: PAGE, cursor });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.items.length).toBeLessThanOrEqual(PAGE);
      seen.push(...r.value.items.map((i) => i.id));
      if (!r.value.nextCursor) break;
      cursor = r.value.nextCursor;
    }
    expect(seen).toHaveLength(ROWS);
    expect(new Set(seen).size).toBe(ROWS);
    // Later micro-offset first; inside a pair the larger id first.
    const order = (id: string) => Number(id.slice(-2));
    const expected = Array.from({ length: ROWS }, (_v, i) => i).sort(
      (a, b) => Math.floor(b / 2) - Math.floor(a / 2) || b - a,
    );
    expect(seen.map(order)).toEqual(expected);
  });

  it('returns a single page with no cursor when everything fits', async () => {
    const { lead, prj } = await setup();
    await seedActivity(prj.id, lead.id, lead.name);
    const r = await listProjectActivity(principal(lead), prj.id, { limit: ROWS });
    expect(r.ok && [r.value.items.length, r.value.nextCursor]).toEqual([ROWS, null]);
  });

  it('uses 20 rows by default and writes the sentence with the actor', async () => {
    const { lead, prj } = await setup();
    await seedActivity(prj.id, lead.id, lead.name);
    const r = await listProjectActivity(principal(lead), prj.id, {});
    expect(r.ok && r.value.items).toHaveLength(20);
    expect(r.ok && r.value.items[0]?.text).toBe(`${lead.name} mengubah keterangan proyek`);
  });

  it('names the person a member change is about, and marks a deleted actor', async () => {
    const { lead, member, prj } = await setup();
    await db.execute(sql`
      insert into project_activity (id, project_id, actor_id, actor_name, action, payload) values
        (${`${prj.id}-m1`}, ${prj.id}, ${lead.id}, ${lead.name}, 'member_added',
          ${JSON.stringify({ userId: member.id, role: 'member' })}::jsonb),
        (${`${prj.id}-m2`}, ${prj.id}, null, 'Mantan Staf', 'trashed', '{}'::jsonb)`);
    const r = await listProjectActivity(principal(lead), prj.id, {});
    const texts = r.ok ? r.value.items.map((i) => i.text) : [];
    expect(texts).toContain(`${lead.name} menambahkan ${member.name} ke proyek sebagai Anggota`);
    expect(texts).toContain('Mantan Staf (akun dihapus) memindahkan proyek ke Sampah');
  });

  it('lets a plain member read it but hides it from an outsider (same as a missing project)', async () => {
    const { member, outsider, prj } = await setup();
    expect((await listProjectActivity(principal(member), prj.id, {})).ok).toBe(true);
    expect(await listProjectActivity(principal(outsider), prj.id, {})).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await listProjectActivity(principal(member), 'no-such-project', {})).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it.each([
    ['not base64 json', 'bukan-kursor'],
    ['a number as the time', encodeCursor(5, 'x')],
    ['text that is not a timestamp', encodeCursor('kemarin', 'x')],
    ['an impossible date', encodeCursor('2030-02-30 10:00:00+00', 'x')],
    ['an impossible clock time', encodeCursor('2030-02-10 25:00:00+00', 'x')],
  ])('answers VALIDATION for a cursor that is %s', async (_n, cursor) => {
    const { lead, prj } = await setup();
    expect(await listProjectActivity(principal(lead), prj.id, { cursor })).toEqual({
      ok: false,
      code: 'VALIDATION',
    });
  });
});
