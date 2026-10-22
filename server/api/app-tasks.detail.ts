/**
 * Task detail routes (S2-06): checklist steps, comments and the timeline under `/tasks/:ref`.
 * Writes answer the fresh state (the whole checklist with its "2/3" progress, or the comment), so
 * the detail page redraws without a reload. Both DELETE routes are session-only (`PM_KEY_DENY`).
 */
import { Elysia, t } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import {
  addChecklistItem,
  type ChecklistResult,
  removeChecklistItem,
  updateChecklistItem,
} from '../task/task-checklist.service';
import { addComment, editComment, removeComment } from '../task/task-comment.service';
import { getTaskTimeline } from '../task/task-timeline.query';
import { CursorQuery } from './app-common';
import { appContext } from './app-context';
import { Id } from './app-tasks.schema';

type Actor = { user: { id: string; name: string } } & Parameters<typeof toPrincipal>[0];
type StatusFn = Parameters<typeof fail>[0];
const authorOf = (actor: Actor) => ({ principal: toPrincipal(actor), name: actor.user.name });

const TaskParams = t.Object({ ref: Id });
const ItemParams = t.Object({ ref: Id, itemId: Id });
const CommentParams = t.Object({ ref: Id, commentId: Id });
// Lengths and blanks are the services' checks, so the form gets the same 422 message as the server.
const StepBody = t.Object({ text: t.String() });
const StepPatch = t.Object({
  text: t.Optional(t.String()),
  isDone: t.Optional(t.Boolean()),
  position: t.Optional(t.Integer({ minimum: 0 })),
});
const CommentBody = t.Object({ body: t.String() });

/** Maps a checklist refusal to the uniform error body, else `{ item, checklist }`. */
function checklistReply(r: ChecklistResult, status: StatusFn) {
  if (!r.ok) return fail(status, r.code, r.error ? { error: r.error } : {});
  return { item: r.item, checklist: r.checklist };
}

export const taskDetailApi = new Elysia({ prefix: '/tasks' })
  .use(appContext)
  /** Adds a step at the end of the task's checklist; answers 201 `{ item, checklist }`. */
  .post(
    '/:ref/checklist',
    async ({ actor, body, params, status }) => {
      const r = await addChecklistItem(toPrincipal(actor), params.ref, body.text, requestClock());
      if (!r.ok) return checklistReply(r, status);
      return status(201, { item: r.item, checklist: r.checklist });
    },
    { params: TaskParams, body: StepBody },
  )
  /** Changes a step's text, tick or place; answers `{ item, checklist }`. */
  .patch(
    '/:ref/checklist/:itemId',
    async ({ actor, body, params, status }) =>
      checklistReply(
        await updateChecklistItem(
          toPrincipal(actor),
          params.ref,
          params.itemId,
          body,
          requestClock(),
        ),
        status,
      ),
    { params: ItemParams, body: StepPatch },
  )
  /** Removes a step for good; answers `{ item: null, checklist }`. */
  .delete(
    '/:ref/checklist/:itemId',
    async ({ actor, params, status }) =>
      checklistReply(
        await removeChecklistItem(toPrincipal(actor), params.ref, params.itemId, requestClock()),
        status,
      ),
    { params: ItemParams },
  )
  /** Adds a plain-text comment; answers 201 with the comment as the timeline shows it. */
  .post(
    '/:ref/comments',
    async ({ actor, body, params, status }) => {
      const r = await addComment(authorOf(actor), params.ref, body.body, requestClock());
      if (!r.ok) return fail(status, r.code, r.error ? { error: r.error } : {});
      return status(201, r.comment);
    },
    { params: TaskParams, body: CommentBody },
  )
  /** Changes the text of the caller's own comment. */
  .patch(
    '/:ref/comments/:commentId',
    async ({ actor, body, params, status }) => {
      const r = await editComment(
        authorOf(actor),
        params.ref,
        params.commentId,
        body.body,
        requestClock(),
      );
      return r.ok ? r.comment : fail(status, r.code, r.error ? { error: r.error } : {});
    },
    { params: CommentParams, body: CommentBody },
  )
  /** Removes a comment for good (author, project manager or Admin); answers `{ id }`. */
  .delete(
    '/:ref/comments/:commentId',
    async ({ actor, params, status }) => {
      const r = await removeComment(authorOf(actor), params.ref, params.commentId);
      return r.ok ? { id: r.id } : fail(status, r.code);
    },
    { params: CommentParams },
  )
  /** Comments and activity as one stream, newest first: `{ items, nextCursor }`. */
  .get(
    '/:ref/timeline',
    async ({ actor, params, query, status }) => {
      const r = await getTaskTimeline(toPrincipal(actor), params.ref, query);
      if (r.ok) return { items: r.items, nextCursor: r.nextCursor };
      if (r.code === 'NOT_FOUND') return fail(status, 'NOT_FOUND');
      return status(400, {
        error: 'Halaman riwayat tidak dikenali. Muat ulang dari awal.',
        code: 'BAD_CURSOR',
      });
    },
    { params: TaskParams, query: CursorQuery },
  );
