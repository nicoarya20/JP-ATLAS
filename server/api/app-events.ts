/**
 * Event read routes (`/api/app/events`, S7 E-06, sync point SP-E2): the keyset list, the Beranda
 * Agenda, the guest picker and one event by id. The DTOs come from `event/events.dto.ts` unchanged,
 * so the event UI binds to `items[].can` and `caps.createEvent` exactly as the service builds them.
 *
 * The writes live in `app-events.write.ts` and the minutes in `app-events.notes.ts`, both mounted
 * here so they share this prefix and this module stays inside its 150-line budget.
 *
 * `appContext` is the 401 gate: it answers before body validation, so an anonymous caller never
 * sees a 422 schema hint. It is nested (not thrown from a `derive` of our own) because a thrown
 * `status()` in `derive` becomes a 500.
 */
import { Elysia } from 'elysia';
import { appCaps } from '../access/capabilities';
import { requestEventClock } from '../event/events.clock';
import { agendaFor, getEvent, listEvents } from '../event/events.query';
import { parseEventRange } from '../event/events.range';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { pickPeople } from '../team/picker.query';
import { IdParam } from './app-common';
import { appContext } from './app-context';
import { eventNotesApi } from './app-events.notes';
import { asList, ListQuery, PeopleQuery } from './app-events.schema';
import { eventWriteApi } from './app-events.write';

export const eventsApi = new Elysia({ prefix: '/events' })
  .use(appContext)
  .use(eventWriteApi)
  .use(eventNotesApi)
  /**
   * One page of the events the caller may see: `{ items, nextCursor, caps }`. The tab defaults to
   * `upcoming`; a malformed or foreign cursor answers 400 `BAD_CURSOR` instead of an empty page.
   *
   * `?from=&to=` is the calendar window of A9: the events that touch those days, past ones
   * included, in place of the tab's cut on `now`. Left out, the answer is exactly what it was.
   */
  .get(
    '/',
    async ({ actor, query, status }) => {
      const principal = toPrincipal(actor);
      const range = parseEventRange(query.from, query.to);
      if (!range.ok) return fail(status, 'VALIDATION', { error: range.error });
      const result = await listEvents(
        principal,
        {
          tab: query.tab,
          range: range.range,
          kind: asList(query.kind),
          projectId: query.projectId,
          q: query.q?.trim() || undefined,
          limit: query.limit,
          cursor: query.cursor,
        },
        requestEventClock(),
      );
      if (!result.ok) {
        return status(400, {
          error: 'Halaman daftar tidak dikenali. Muat ulang daftar dari awal.',
          code: 'BAD_CURSOR',
        });
      }
      return {
        items: result.items,
        nextCursor: result.nextCursor,
        // Only the one capability this page needs: the "+ Acara baru" button (X3 M29).
        caps: { createEvent: appCaps(principal).createEvent },
      };
    },
    { query: ListQuery },
  )
  /** The Beranda Agenda widget: at most four of my own events for today and tomorrow (R10 H3). */
  .get('/agenda', async ({ actor }) => ({
    items: await agendaFor(toPrincipal(actor), requestEventClock()),
  }))
  /**
   * Guest candidates for the event form: names and job titles only (Q8). Delegates to the team
   * picker unchanged, so one policy decides who may be listed; with `projectId` the project's own
   * people are offered, and an unscoped search follows the picker's existing rule.
   */
  .get(
    '/people',
    async ({ actor, query, status }) => {
      const r = await pickPeople(toPrincipal(actor), query);
      return r.ok ? { items: r.items } : fail(status, r.code);
    },
    { query: PeopleQuery },
  )
  /** One event with its guests, minutes and `can{}`; hidden and missing both answer the same 404. */
  .get(
    '/:id',
    async ({ actor, params, status }) => {
      const r = await getEvent(toPrincipal(actor), params.id);
      return r.ok ? r.event : fail(status, r.code);
    },
    { params: IdParam },
  );
