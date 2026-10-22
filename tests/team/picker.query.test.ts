/** People picker query (S1-04): only id/name/jobTitle/image (Q8), active accounts, access per projectId, clamped limit. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { profile } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import {
  PICKER_LIMIT_DEFAULT,
  PICKER_LIMIT_MAX,
  pickerLimit,
  pickPeople,
} from '../../server/team/picker.query';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'picker' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });
/** A name unique to this test, so other rows in the shared test DB never match the search. */
const unique = () => `Cari${crypto.randomUUID().slice(0, 8)}`;

describe('pickPeople', () => {
  it('returns only id, name, jobTitle and image: never email or phone (Q8)', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const name = unique();
    const person = await f.user({ name: `${name} Satu` });
    await db
      .insert(profile)
      .values({ userId: person.id, jobTitle: 'Bendahara', phone: '081200000000' }); // test-only
    const r = await pickPeople(principal(pm), { q: name });
    expect(r).toEqual({
      ok: true,
      items: [{ id: person.id, name: `${name} Satu`, jobTitle: 'Bendahara', image: null }],
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain('@');
    expect(json).not.toContain('081200000000');
  });

  it('leaves out pending, rejected and banned accounts and sorts by name', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const name = unique();
    const b = await f.user({ name: `${name} B` });
    const a = await f.user({ name: `${name} A` });
    await f.user({ name: `${name} C`, status: 'pending' });
    await f.user({ name: `${name} D`, status: 'rejected' });
    await f.user({ name: `${name} E`, banned: true });
    const r = await pickPeople(principal(pm), { q: name.toLowerCase() });
    expect(r.ok && r.items.map((p) => p.id)).toEqual([a.id, b.id]);
  });

  it('matches LIKE wildcards in the search literally', async () => {
    const pm = await f.user({ role: 'project_manager' });
    await f.user({ name: `${unique()} Biasa` });
    const r = await pickPeople(principal(pm), { q: '%' });
    expect(r).toEqual({ ok: true, items: [] });
  });

  it('without projectId, only people who may create projects may search', async () => {
    const member = await f.user();
    expect(await pickPeople(principal(member), {})).toEqual({ ok: false, code: 'NOT_APP_ROLE' });
    const admin = await f.user({ role: 'admin' });
    expect((await pickPeople(principal(admin), {})).ok).toBe(true);
  });

  it('with projectId, members and Admin search the people not yet in the project', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const viewer = await f.user();
    const name = unique();
    const inside = await f.user({ name: `${name} Dalam` });
    const outside = await f.user({ name: `${name} Luar` });
    const prj = await f.project({
      lead,
      members: [
        [viewer, 'viewer'],
        [inside, 'member'],
      ],
    });
    const admin = await f.user({ role: 'admin' });
    for (const u of [viewer, admin]) {
      const r = await pickPeople(principal(u), { q: name, projectId: prj.id });
      expect(r.ok && r.items.map((p) => p.id)).toEqual([outside.id]);
    }
  });

  it('refuses an outsider (NOT_FOUND) and a non-member Project Manager (NOT_MEMBER)', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const prj = await f.project({ lead });
    const outsider = await f.user();
    const pmX = await f.user({ role: 'project_manager' });
    expect(await pickPeople(principal(outsider), { projectId: prj.id })).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await pickPeople(principal(pmX), { projectId: prj.id })).toEqual({
      ok: false,
      code: 'NOT_MEMBER',
    });
    expect(await pickPeople(principal(lead), { projectId: 'no-such-project' })).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it('never returns more than the clamped limit', async () => {
    const pm = await f.user({ role: 'project_manager' });
    const name = unique();
    await f.user({ name: `${name} 1` });
    await f.user({ name: `${name} 2` });
    await f.user({ name: `${name} 3` });
    const r = await pickPeople(principal(pm), { q: name, limit: 2 });
    expect(r.ok && r.items).toHaveLength(2);
  });
});

describe('pickerLimit', () => {
  it.each([
    [undefined, PICKER_LIMIT_DEFAULT],
    [Number.NaN, PICKER_LIMIT_DEFAULT],
    [0, 1],
    [7.9, 7],
    [PICKER_LIMIT_MAX + 1, PICKER_LIMIT_MAX],
    [1e9, PICKER_LIMIT_MAX],
  ])('%p becomes %p', (input, expected) => {
    expect(pickerLimit(input)).toBe(expected);
  });
});
