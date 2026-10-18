/**
 * "The card disappears whichever way you work" (S3 I06, gate G-2). The hooks sit in the services,
 * so the same four actions must close the same `task_assigned` card through the API router whether
 * the caller is a signed-in person or an API key with `app:write`. Both paths run the real router;
 * only the identity differs. An MCP tool will follow for free, because it, too, goes through the
 * service (P5 §2 K6).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { api } from '../../server/api';
import { setApiKeyIdentity } from '../../server/api-keys/identity';
import { flushUsage } from '../../server/api-keys/usage';
import { db } from '../../server/db';
import { notification, taskActivity } from '../../server/db/schema';
import type { Role } from '../../server/permissions';
import { call, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'resolveany' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  // The buffered usage rows name a key that never existed; draining them here keeps the warning
  // out of a later test file's run.
  await flushUsage();
  resetApiLimiters();
  await cleaner.flushAll();
});

/** The open or closed `task_assigned` card of the person the task was handed to. */
async function assignedCard(recipient: TestUser, taskId: string) {
  const [row] = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, recipient.id),
        eq(notification.refId, taskId),
        eq(notification.kind, 'task_assigned'),
      ),
    );
  return row ?? null;
}

/** One call through the real router, authenticated by an API key instead of a cookie session. */
async function callAsKey(owner: TestUser, method: string, path: string, body?: unknown) {
  const request = new Request(`http://localhost/api${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  setApiKeyIdentity(request, {
    keyId: `${f.tag}-key`,
    keyName: null,
    scopes: ['app:read', 'app:write'],
    user: { id: owner.id, email: owner.email, name: owner.name, role: owner.role },
    role: owner.role as Role,
    startedAt: performance.now(),
  });
  const res = await api.handle(request);
  return { status: res.status, body: (await res.json().catch(() => null)) as unknown };
}

/** A project plus a task `lead` created for `member`, so `member` holds one open card. */
async function scenario() {
  const lead = await f.user({ role: 'project_manager' });
  const member = await f.user();
  const mate = await f.user();
  const proj = await f.project({
    lead,
    members: [
      [member, 'member'],
      [mate, 'member'],
    ],
  });
  // The lead creates the task through the router, so the card under test is written by the hook.
  auth.as(lead);
  const created = await call('POST', '/app/tasks', {
    projectId: proj.id,
    title: 'Pasang rak dapur', // test-only
    assigneeId: member.id,
  });
  if (created.status !== 201) throw new Error(`task create answered ${created.status}`);
  const taskId = cleaner.track('task', created.body.id as string);
  for (const row of await db
    .select({ id: taskActivity.id })
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))) {
    cleaner.track('taskPart', row.id);
  }
  return { lead, member, mate, taskId };
}

/** The four actions that must close the card, each with who may take it and what it is called. */
const ACTIONS = [
  ['start', 'acted', 'worker'],
  ['complete', 'acted', 'worker'],
  ['cancel', 'target_closed', 'manager'],
  ['reassign', 'superseded', 'manager'],
] as const;

type Scenario = Awaited<ReturnType<typeof scenario>>;
type Action = (typeof ACTIONS)[number][0];

/** The request one action is: method, path and body, for both identities. */
function requestFor(action: Action, s: Scenario): [string, string, unknown] {
  if (action === 'reassign') return ['PATCH', `/app/tasks/${s.taskId}`, { assigneeId: s.mate.id }];
  if (action === 'cancel')
    return ['POST', `/app/tasks/${s.taskId}/cancel`, { category: 'not_needed' }];
  return ['POST', `/app/tasks/${s.taskId}/${action}`, undefined];
}

describe('a signed-in person', () => {
  it.each(ACTIONS)('%s closes the card as %s', async (action, reason, who) => {
    const s = await scenario();
    const actor = who === 'worker' ? s.member : s.lead;
    const [method, path, body] = requestFor(action, s);

    auth.as(actor);
    const res = await call(method, path, body);

    expect(res.status).toBe(200);
    const card = await assignedCard(s.member, s.taskId);
    expect(card?.resolvedAt).not.toBeNull();
    expect(card?.resolvedReason).toBe(reason);
  });
});

describe('an API key with app:write', () => {
  it.each(ACTIONS)(
    '%s closes the card as %s, with no session at all',
    async (action, reason, who) => {
      auth.as({ id: 'bootstrap', role: 'admin' });
      const s = await scenario();
      const actor = who === 'worker' ? s.member : s.lead;
      const [method, path, body] = requestFor(action, s);

      auth.as(null);
      const res = await callAsKey(actor, method, path, body);

      expect(res.status).toBe(200);
      const card = await assignedCard(s.member, s.taskId);
      expect(card?.resolvedAt).not.toBeNull();
      expect(card?.resolvedReason).toBe(reason);
    },
  );

  it('is really the key that authenticates: the same call without one is 401', async () => {
    const s = await scenario();

    auth.as(null);
    const anonymous = await call('POST', `/app/tasks/${s.taskId}/start`);

    expect(anonymous.status).toBe(401);
    expect(await assignedCard(s.member, s.taskId)).toMatchObject({ resolvedAt: null });
  });

  it('writes the new card for the key owner path too, not just a resolve', async () => {
    const s = await scenario();

    auth.as(null);
    const res = await callAsKey(s.lead, 'PATCH', `/app/tasks/${s.taskId}`, {
      assigneeId: s.mate.id,
    });

    expect(res.status).toBe(200);
    const next = await assignedCard(s.mate, s.taskId);
    expect(next).toMatchObject({ lane: 'action', resolvedAt: null, actorId: s.lead.id });
  });
});
