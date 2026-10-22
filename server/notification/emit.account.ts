/**
 * The Inbox cards the Akun module sends (S3 I14, P5 §5.5 row 10): the Admin queue card that says
 * somebody has signed up and is waiting to be let in, and the one call that takes it away again.
 *
 * Two things set these apart from the task and project hooks. The card has no project — an Admin
 * need not be on any — so `project_id` stays NULL and nothing gates who may see it beyond being an
 * Admin. And it is the only card S3 sends to several people for one piece of work, which is why
 * `userDecided` resolves by ref without naming a recipient: the moment one Admin approves, rejects
 * or blocks the account, the card leaves every other Admin's Inbox too, instead of leaving four
 * people queueing for work that is already done.
 */
import { eq } from 'drizzle-orm';
import { user } from '../db/schema';
import type { Executor } from '../pm/tx';
import { notify } from './notification.notify';
import { admins } from './notification.recipients';
import { resolveNotifications } from './notification.resolve';

const userRef = (id: string) => ({ type: 'user', id }) as const;

/**
 * A new account is waiting: every Admin and Super-admin gets one card that opens `/dashboard/users`.
 * Only the display name travels — never the address the person signed up with (R12).
 *
 * It reads the account first and gives up unless it is really `pending`, so the common sign-ups
 * that need no decision — an invitation, a Super-admin address, any policy that approves on the
 * spot — put nothing in anybody's Inbox. Called a second time for the same account it writes
 * nothing new either: the `action` lane keeps one card per `(recipient, user)`.
 */
export async function emitUserPending(exec: Executor, userId: string): Promise<void> {
  const [row] = await exec
    .select({ name: user.name, approvalStatus: user.approvalStatus })
    .from(user)
    .where(eq(user.id, userId));
  if (row?.approvalStatus !== 'pending') return;
  await notify(exec, {
    kind: 'user_pending',
    recipients: await admins(exec),
    // The person who signed up is the actor, so the card carries their face; an Admin who signs
    // themselves up is filtered out of their own card by `notify()`.
    actorId: userId,
    projectId: null,
    ref: userRef(userId),
    payload: { name: row.name },
  });
}

/**
 * The queue item is done — the account was approved, rejected or blocked — so the card goes for
 * everyone who held it. Whoever decided sees it closed as `acted`; the other Admins see
 * `elsewhere`, because for them it really was handled somewhere else. Idempotent, so a second
 * decision on the same account closes nothing and costs one indexed update.
 */
export async function emitUserDecided(
  exec: Executor,
  userId: string,
  i: { by?: string | null; at?: Date } = {},
): Promise<void> {
  const common = { ref: userRef(userId), kinds: ['user_pending'] as const, at: i.at };
  if (i.by) await resolveNotifications(exec, { ...common, recipientId: i.by, reason: 'acted' });
  await resolveNotifications(exec, { ...common, reason: 'elsewhere' });
}
