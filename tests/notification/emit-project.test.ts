/**
 * The project and membership hooks (S3 I07, P5 §5.5 rows 7-9), seen from the Inbox. Driven through
 * `addMember` / `changeMemberRole` / `removeMember` / `trashProject`, because the hook belongs to
 * the service: the cards must follow the write whatever called it, not only the UI route.
 */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification, taskActivity } from '../../server/db/schema';
import { inboxActionCount, listInbox } from '../../server/notification/notification.query';
import { addMember, changeMemberRole, removeMember } from '../../server/project/member.service';
import { toPrincipal } from '../../server/project/membership.query';
import { restoreProject, trashProject } from '../../server/project/project-trash.service';
import { createTask, type TaskAuthor } from '../../server/task/task.service';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitprj' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const NOW = new Date('2026-10-18T09:00:00Z'); // test-only
const clock = { now: NOW, today: '2026-10-18' };
const as = (u: TestUser): Principal => ({
  ...toPrincipal({ user: u, role: u.role }),
  impersonating: false,
});
const author = (u: TestUser): TaskAuthor => ({ principal: as(u), name: u.name });

/** Every card one person holds for one project, oldest first then by kind. */
const cardsOf = (recipient: TestUser, projectId: string) =>
  db
    .select()
    .from(notification)
    .where(and(eq(notification.recipientId, recipient.id), eq(notification.projectId, projectId)))
    .orderBy(notification.createdAt, notification.kind);

const kindsOf = async (recipient: TestUser, projectId: string) =>
  (await cardsOf(recipient, projectId)).map((c) => c.kind);

/** A project `lead` manages, with one member already on it and one approved account still outside. */
async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const outsider = await f.user();
  const proj = await f.project({ lead, members: [[member, 'member']], name: 'Renovasi Dapur' });
  return { lead, member, outsider, proj };
}

/** Creates a task through the service, so the assignee really holds an open `action` card. */
async function assign(by: TestUser, projectId: string, to: TestUser): Promise<string> {
  const r = await createTask(
    author(by),
    { projectId, title: 'Pasang rak dapur', assigneeId: to.id }, // test-only
    clock,
  );
  if (!r.ok) throw new Error(`createTask refused with ${r.code}`);
  for (const row of await db
    .select({ id: taskActivity.id })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, r.task.id))) {
    cleaner.track('taskPart', row.id);
  }
  return cleaner.track('task', r.task.id);
}

describe('addMember', () => {
  it('tells the new member which project they were put on, and nobody else', async () => {
    const g = await graph();
    const r = await addMember(as(g.lead), g.proj.id, { userId: g.outsider.id, role: 'member' });
    expect(r.ok).toBe(true);

    const cards = await cardsOf(g.outsider, g.proj.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: 'project_member_added',
      lane: 'info',
      refType: 'project',
      refId: g.proj.id,
      actorId: g.lead.id,
      bundleCount: 1,
      readAt: null,
      resolvedAt: null,
      payload: { projectName: 'Renovasi Dapur', role: 'member' },
    });
    // Whoever pressed the button is never told about their own action, and this is not news to the
    // people who were already on the project.
    expect(await kindsOf(g.lead, g.proj.id)).toEqual([]);
    expect(await kindsOf(g.member, g.proj.id)).toEqual([]);
  });
});

describe('changeMemberRole', () => {
  it('tells the member their role on the project changed', async () => {
    const g = await graph();
    const r = await changeMemberRole(as(g.lead), g.proj.id, g.member.id, 'manager');
    expect(r.ok).toBe(true);

    const cards = await cardsOf(g.member, g.proj.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: 'project_role_changed',
      lane: 'info',
      actorId: g.lead.id,
      payload: { projectName: 'Renovasi Dapur', role: 'manager' },
    });
  });

  it('writes nothing when the role it is asked for is the one already held', async () => {
    const g = await graph();
    const r = await changeMemberRole(as(g.lead), g.proj.id, g.member.id, 'member');
    expect(r.ok).toBe(true);
    expect(await kindsOf(g.member, g.proj.id)).toEqual([]);
  });
});

describe('removeMember', () => {
  it('takes every card of that project away from the person who left it', async () => {
    const g = await graph();
    await assign(g.lead, g.proj.id, g.member);
    await changeMemberRole(as(g.lead), g.proj.id, g.member.id, 'manager');
    expect((await kindsOf(g.member, g.proj.id)).sort()).toEqual([
      'project_role_changed',
      'task_assigned',
    ]);

    const r = await removeMember(as(g.lead), g.proj.id, g.member.id);
    expect(r.ok).toBe(true);

    // Deleted, not resolved: a former member may not keep reading the project's titles (R12 C-INB-1).
    expect(await cardsOf(g.member, g.proj.id)).toEqual([]);
    const list = await listInbox(as(g.member), { lane: 'action' }, NOW);
    if (!list.ok) throw new Error(`listInbox refused with ${list.code}`);
    expect(list.items.map((i) => i.ref.id)).not.toContain(g.proj.id);
    expect(await inboxActionCount(as(g.member))).toBe(0);
  });

  it('leaves their cards in other projects, and other people, alone', async () => {
    const g = await graph();
    const other = await f.project({
      lead: g.lead,
      members: [[g.member, 'member']],
      name: 'Renovasi Kamar',
    });
    await assign(g.lead, g.proj.id, g.member);
    await assign(g.lead, other.id, g.member);
    await addMember(as(g.lead), g.proj.id, { userId: g.outsider.id, role: 'member' });

    const r = await removeMember(as(g.lead), g.proj.id, g.member.id);
    expect(r.ok).toBe(true);

    expect(await kindsOf(g.member, other.id)).toEqual(['task_assigned']);
    expect(await kindsOf(g.outsider, g.proj.id)).toEqual(['project_member_added']);
  });
});

describe('trashProject', () => {
  it('closes every open work card of the project and drops the bell count', async () => {
    const g = await graph();
    await assign(g.lead, g.proj.id, g.member);
    await addMember(as(g.lead), g.proj.id, { userId: g.outsider.id, role: 'member' });
    expect(await inboxActionCount(as(g.member))).toBe(1);

    const r = await trashProject(as(g.lead), g.proj.id, NOW);
    expect(r.ok).toBe(true);

    const [work] = (await cardsOf(g.member, g.proj.id)).filter((c) => c.lane === 'action');
    expect(work).toMatchObject({ kind: 'task_assigned', resolvedReason: 'target_closed' });
    expect(work?.resolvedAt).not.toBeNull();
    expect(await inboxActionCount(as(g.member))).toBe(0);

    // News is history, not work: a card nobody has to answer is left exactly as it was.
    const news = (await cardsOf(g.outsider, g.proj.id))[0];
    expect(news).toMatchObject({ kind: 'project_member_added', resolvedAt: null });
  });

  it('does not bring the closed cards back when the project is restored', async () => {
    const g = await graph();
    await assign(g.lead, g.proj.id, g.member);
    await trashProject(as(g.lead), g.proj.id, NOW);

    const r = await restoreProject(as(g.lead), g.proj.id, NOW);
    expect(r.ok).toBe(true);

    const [work] = (await cardsOf(g.member, g.proj.id)).filter((c) => c.lane === 'action');
    expect(work).toMatchObject({ resolvedReason: 'target_closed' });
    expect(work?.resolvedAt).not.toBeNull();
    expect(await inboxActionCount(as(g.member))).toBe(0);
    const list = await listInbox(as(g.member), { lane: 'action' }, NOW);
    if (!list.ok) throw new Error(`listInbox refused with ${list.code}`);
    expect(list.items).toHaveLength(0);
  });
});
