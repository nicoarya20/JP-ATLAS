/**
 * Task comments (S2-06). Plain text: the body is stored exactly as typed (no Markdown or HTML is
 * parsed, R12 R8) and the UI escapes it on display. Writing follows `canComment` (viewers may, a
 * non-member PM may not, Q7); only the author edits; the author, a project manager or an Admin
 * removes (D6), which deletes the row for good and leaves a `comment.delete` activity. The body
 * never reaches a log line or the audit trail; logs carry ids only (C-LOG-1).
 */
import { and, eq, isNull } from 'drizzle-orm';
import { atLeast, levelOf } from '../access/level';
import { canComment, taskOpen } from '../access/task.policy';
import { taskActivity, taskComment } from '../db/schema';
import { logger } from '../logger';
import { emitTaskCommented } from '../notification/emit.task';
import type { PmCode } from '../pm/errors';
import { inTx } from '../pm/tx';
import type { TaskClock } from './task.dto';
import { TASK_ACTIVITY, TASK_COMMENT_MAX, TASK_WRITE_MESSAGES } from './task.limits';
import type { TaskAuthor } from './task.service';
import { loadTaskAccess, touchTask } from './task-access.query';

/** A comment as the timeline shows it. */
export type CommentView = {
  id: string;
  body: string;
  author: { id: string | null; name: string };
  createdAt: string;
  editedAt: string | null;
};

export type CommentResult =
  | { ok: true; comment: CommentView }
  | { ok: false; code: PmCode; error?: string };
export type RemoveResult = { ok: true; id: string } | { ok: false; code: PmCode };

type Refusal = { ok: false; code: PmCode; error?: string };
const refused = (code: PmCode): Refusal => ({ ok: false, code });
const invalid = (error: string): Refusal => ({ ok: false, code: 'VALIDATION', error });

/** The body to store: the text as typed, refused when blank or longer than `TASK_COMMENT_MAX`. */
function checkBody(body: string): Refusal | null {
  if (!body.trim()) return invalid(TASK_WRITE_MESSAGES.emptyComment);
  return body.length > TASK_COMMENT_MAX ? invalid(TASK_WRITE_MESSAGES.commentTooLong) : null;
}

const viewOf = (row: typeof taskComment.$inferSelect, name: string): CommentView => ({
  id: row.id,
  body: row.body,
  author: { id: row.authorId, name },
  createdAt: row.createdAt.toISOString(),
  editedAt: row.editedAt ? row.editedAt.toISOString() : null,
});

/** Adds a comment from `author` to the task `ref` names; answers 201's body. */
export async function addComment(
  author: TaskAuthor,
  ref: string,
  body: string,
  clock: TaskClock,
): Promise<CommentResult> {
  const bad = checkBody(body);
  if (bad) return bad;
  const p = author.principal;
  return inTx(async (tx): Promise<CommentResult> => {
    const access = await loadTaskAccess(p, ref, tx);
    if (!access) return refused('NOT_FOUND');
    const decision = canComment(p, access.subject, access.m);
    if (!decision.ok) return refused(decision.code);
    const [row] = await tx
      .insert(taskComment)
      .values({ taskId: access.subject.id, authorId: p.id, authorName: author.name, body })
      .returning();
    if (!row) throw new Error(`Comment insert on task ${access.subject.id} returned no row`);
    await touchTask(tx, row.taskId, clock.now);
    await emitTaskCommented(tx, row.taskId, { by: p.id, excerpt: row.body, at: clock.now });
    logger.info({ taskId: row.taskId, commentId: row.id, actorId: p.id }, 'task comment added');
    return { ok: true, comment: viewOf(row, author.name) };
  });
}

/** Changes the text of the caller's own comment; anyone else's answers 403 `NOT_OWNER`. */
export async function editComment(
  author: TaskAuthor,
  ref: string,
  commentId: string,
  body: string,
  clock: TaskClock,
): Promise<CommentResult> {
  const bad = checkBody(body);
  if (bad) return bad;
  const p = author.principal;
  return inTx(async (tx): Promise<CommentResult> => {
    const access = await loadTaskAccess(p, ref, tx);
    if (!access) return refused('NOT_FOUND');
    const own = and(
      eq(taskComment.id, commentId),
      eq(taskComment.taskId, access.subject.id),
      isNull(taskComment.deletedAt),
    );
    const [cur] = await tx.select({ authorId: taskComment.authorId }).from(taskComment).where(own);
    if (!cur) return refused('NOT_FOUND');
    // Losing the right to comment (left the project) also ends the right to edit old comments.
    const decision = canComment(p, access.subject, access.m);
    if (!decision.ok) return refused(decision.code);
    if (cur.authorId !== p.id) return refused('NOT_OWNER');
    const [row] = await tx
      .update(taskComment)
      .set({ body, editedAt: clock.now })
      .where(own)
      .returning();
    if (!row) return refused('NOT_FOUND');
    await touchTask(tx, row.taskId, clock.now);
    logger.info({ taskId: row.taskId, commentId: row.id, actorId: p.id }, 'task comment edited');
    return { ok: true, comment: viewOf(row, author.name) };
  });
}

/** Removes a comment for good: its author, a project manager or an Admin (D6). */
export async function removeComment(
  author: TaskAuthor,
  ref: string,
  commentId: string,
): Promise<RemoveResult> {
  const p = author.principal;
  return inTx(async (tx): Promise<RemoveResult> => {
    const access = await loadTaskAccess(p, ref, tx);
    if (!access) return refused('NOT_FOUND');
    const own = and(eq(taskComment.id, commentId), eq(taskComment.taskId, access.subject.id));
    const [cur] = await tx.select({ authorId: taskComment.authorId }).from(taskComment).where(own);
    if (!cur) return refused('NOT_FOUND');
    const manages = atLeast(levelOf(p, access.m), 'manager');
    const isAuthor = cur.authorId === p.id && canComment(p, access.subject, access.m).ok;
    if (!manages && !isAuthor) return refused('NOT_OWNER');
    const open = taskOpen(access.subject);
    if (!open.ok) return refused(open.code);
    await tx.delete(taskComment).where(own);
    await tx.insert(taskActivity).values({
      taskId: access.subject.id,
      actorId: p.id,
      actorName: author.name,
      action: TASK_ACTIVITY.commentDelete,
      payload: { commentId },
    });
    logger.info({ taskId: access.subject.id, commentId, actorId: p.id }, 'task comment removed');
    return { ok: true, id: commentId };
  });
}
