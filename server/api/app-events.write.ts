/**
 * Event write routes (S7 E-06), mounted inside `eventsApi` so they share its `/events` prefix:
 * create, change, cancel and the guest list. Bodies are closed by `app-events.schema.ts`, so a
 * Could-class field (recurrence, outcomes) answers 422 rather than being silently dropped.
 *
 * There is no `DELETE /:id` here: moving an event to the Trash is E-07, together with restore and
 * the Trash list. Cancelling is not deleting — the event stays visible with its reason, because
 * the guests already planned around it (P6 §4).
 *
 * Every refusal goes through `fail`, so the status and the sentence come from the one error catalog
 * (`server/pm/errors.ts`): a project in the Trash is 409 `PROJECT_IN_TRASH`, a Pemantau attaching an
 * event to the project they only watch is 403 `NOT_MEMBER`, and a hidden event is the 404 a missing
 * one gives.
 */
import { Elysia } from 'elysia';
import { requestEventClock } from '../event/events.clock';
import {
  addParticipants,
  cancelEvent,
  createEvent,
  type EventWriteResult,
  removeParticipant,
  updateEvent,
} from '../event/events.service';
import type { PmHttp } from '../pm/errors';
import { fail, type PmErrorBody } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { IdParam } from './app-common';
import { appContext } from './app-context';
import {
  CancelBody,
  CreateBody,
  InviteBody,
  ParticipantParams,
  UpdateBody,
} from './app-events.schema';

/** The one answer shape of a write: the event as a read would return it, or the catalog's refusal. */
function answer<R>(r: EventWriteResult, status: (http: PmHttp, body: PmErrorBody) => R) {
  return r.ok ? r.event : fail(status, r.code, r.error ? { error: r.error } : {});
}

export const eventWriteApi = new Elysia()
  .use(appContext)
  /** Creates an event and invites its guests in one transaction; answers 201 with the detail. */
  .post(
    '/',
    async ({ actor, body, status }) => {
      // `body` goes straight in: the Could-class keys are `t.Never()`, so a request carrying one
      // has already been refused with 422 and the handler can never see it.
      const r = await createEvent(toPrincipal(actor), body);
      return r.ok ? status(201, r.event) : answer(r, status);
    },
    { body: CreateBody },
  )
  /** Changes an event; moving `startsAt` re-arms its reminders so the new time is reminded about. */
  .patch(
    '/:id',
    async ({ actor, body, params, status }) =>
      answer(await updateEvent(toPrincipal(actor), params.id, body), status),
    { params: IdParam, body: UpdateBody },
  )
  /** Cancels an event with the reason its guests read; the row stays, its reminders do not. */
  .post(
    '/:id/cancel',
    async ({ actor, body, params, status }) => {
      const { now } = requestEventClock();
      return answer(await cancelEvent(toPrincipal(actor), params.id, body.reason, now), status);
    },
    { params: IdParam, body: CancelBody },
  )
  /** Invites more guests; re-inviting someone already on the list is a no-op, not an error. */
  .post(
    '/:id/participants',
    async ({ actor, body, params, status }) => {
      const r = await addParticipants(toPrincipal(actor), params.id, body.userIds);
      return r.ok ? { participants: r.participants } : fail(status, r.code);
    },
    { params: IdParam, body: InviteBody },
  )
  /** Removes one guest; removing someone who is not on the list is a no-op. */
  .delete(
    '/:id/participants/:userId',
    async ({ actor, params, status }) => {
      const r = await removeParticipant(toPrincipal(actor), params.id, params.userId);
      return r.ok ? { participants: r.participants } : fail(status, r.code);
    },
    { params: ParticipantParams },
  );
