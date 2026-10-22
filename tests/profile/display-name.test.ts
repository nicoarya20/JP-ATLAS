/**
 * The "Nama" saved in Pengaturan is the name colleagues see: Tim (list, search, sort, person),
 * the people picker, a project's members and lead, and an Inbox card's actor. A blank or missing
 * display name falls back to the account name everywhere.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { notification, profile } from '../../server/db/schema';
import { listInbox } from '../../server/notification/notification.query';
import { updateProfile } from '../../server/profile/profile.service';
import { toPrincipal } from '../../server/project/membership.query';
import { getProjectDetail, listProjectMembers } from '../../server/project/project.query';
import { pickPeople } from '../../server/team/picker.query';
import { getPerson } from '../../server/team/team.person.query';
import { listTeam } from '../../server/team/team.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'dispname' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;
const principal = (u: TestUser) => toPrincipal({ user: u, role: u.role });

/** A lead and a member sharing one project, both named after a per-test marker. */
async function world() {
  const mk = marker();
  const lead = await f.user({ role: 'project_manager', name: `${mk} Lead Google` });
  const mate = await f.user({ name: `${mk} Mate Google` });
  const proj = await f.project({ lead, members: [[mate, 'member']], name: `${mk} Proyek` });
  return { mk, lead, mate, proj };
}

describe('Tim', () => {
  it('lists, searches and sorts a person by the display name, and drops the account name', async () => {
    const { mk, lead, mate } = await world();
    await updateProfile(mate.id, { displayName: `  ${mk} Aaa Panggilan  ` });
    const all = await listTeam(principal(lead), { q: mk, limit: 50 }, ATLAS_NOW);
    if ('ok' in all) throw new Error(`refused ${all.code}`);
    // "Aaa Panggilan" sorts before "Lead Google" (self first), and the Google name is gone.
    expect(all.people.map((p) => p.name)).toEqual([`${mk} Lead Google`, `${mk} Aaa Panggilan`]);
    const byNick = await listTeam(principal(lead), { q: 'Panggilan', limit: 50 }, ATLAS_NOW);
    if ('ok' in byNick) throw new Error(`refused ${byNick.code}`);
    expect(byNick.people.map((p) => p.id)).toContain(mate.id);
    const byGoogle = await listTeam(
      principal(lead),
      { q: `${mk} Mate Google`, limit: 50 },
      ATLAS_NOW,
    );
    if ('ok' in byGoogle) throw new Error(`refused ${byGoogle.code}`);
    expect(byGoogle.people.map((p) => p.id)).not.toContain(mate.id);
  });

  it('shows the display name on the person page', async () => {
    const { lead, mate, mk } = await world();
    await updateProfile(mate.id, { displayName: `${mk} Nama Pilihan` });
    const res = await getPerson(principal(lead), mate.id, ATLAS_NOW);
    if ('ok' in res && res.ok === false) throw new Error(`refused ${res.code}`);
    expect((res as { person: { name: string } }).person.name).toBe(`${mk} Nama Pilihan`);
  });

  it('falls back to the account name when the display name is blank (the lead has no profile row at all)', async () => {
    const { lead, mate, mk } = await world();
    await updateProfile(mate.id, { displayName: '   ' });
    const [row] = await db.select().from(profile).where(eq(profile.userId, mate.id));
    expect(row?.displayName).toBeNull();
    const res = await listTeam(principal(lead), { q: mk, limit: 50 }, ATLAS_NOW);
    if ('ok' in res) throw new Error(`refused ${res.code}`);
    expect(res.people.map((p) => p.name).sort()).toEqual([
      `${mk} Lead Google`,
      `${mk} Mate Google`,
    ]);
  });
});

describe('people picker', () => {
  it('searches and returns the display name', async () => {
    const { mk, lead, mate } = await world();
    await updateProfile(mate.id, { displayName: `${mk} Si Pilihan` });
    const res = await pickPeople(principal(lead), { q: 'Si Pilihan' });
    expect(res.ok && res.items.find((i) => i.id === mate.id)?.name).toBe(`${mk} Si Pilihan`);
  });
});

describe('projects', () => {
  it('shows the display name in the member list and as the lead', async () => {
    const { mk, lead, mate, proj } = await world();
    await updateProfile(mate.id, { displayName: `${mk} Anggota Baru` });
    await updateProfile(lead.id, { displayName: `${mk} Pengelola Baru` });
    const members = await listProjectMembers(principal(lead), proj.id);
    expect(members?.map((m) => m.name).sort()).toEqual([
      `${mk} Anggota Baru`,
      `${mk} Pengelola Baru`,
    ]);
    const detail = await getProjectDetail(principal(mate), proj.id, ATLAS_NOW);
    expect(detail?.lead?.name).toBe(`${mk} Pengelola Baru`);
  });
});

describe('Inbox', () => {
  it('names the actor of a card by the display name', async () => {
    const { mk, lead, mate, proj } = await world();
    await updateProfile(lead.id, { displayName: `${mk} Si Pengirim` });
    await db.insert(notification).values({
      recipientId: mate.id,
      actorId: lead.id,
      projectId: proj.id,
      lane: 'info',
      kind: 'task_commented',
      refType: 'project',
      refId: proj.id,
      dedupeKey: `test:${mk}`,
      payload: { title: 'Tugas uji', taskNumber: 1 }, // test-only
    });
    const res = await listInbox(principal(mate), { lane: 'info', limit: 10 }, ATLAS_NOW);
    if (!res.ok) throw new Error(`refused ${res.code}`);
    expect(res.items[0]?.actor?.name).toBe(`${mk} Si Pengirim`);
  });
});
