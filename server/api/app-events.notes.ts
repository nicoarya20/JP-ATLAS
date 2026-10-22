/**
 * The minutes route (`PUT /api/app/events/:id/note`, S7 E-06), mounted inside `eventsApi`. One
 * endpoint, its own module: the optimistic lock has an answer shape no other event route has.
 *
 * A save that lost the lock answers 409 `NOTE_CONFLICT` **with the newer minutes in `note`**, so
 * the page can offer "Muat versi terbaru" beside what is still being typed instead of reloading and
 * losing it (P6 §4). A document already marked final answers 409 the same way, with its text.
 */
import { Elysia } from 'elysia';
import { saveNote } from '../event/events.notes';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { IdParam } from './app-common';
import { appContext } from './app-context';
import { NoteBody } from './app-events.schema';

export const eventNotesApi = new Elysia()
  .use(appContext)
  /**
   * Writes the minutes of one event: `{ note, badge }` on success. `baseUpdatedAt` is the version
   * the writer loaded; leaving it out means "there were no minutes when I opened this".
   */
  .put(
    '/:id/note',
    async ({ actor, body, params, status }) => {
      const r = await saveNote(toPrincipal(actor), { eventId: params.id, ...body });
      if (r.ok) return { note: r.note, badge: r.badge };
      // `latest` travels as `note`, the same key a successful save uses, so one client branch reads both.
      return fail(status, r.code, {
        ...(r.error ? { error: r.error } : {}),
        ...(r.latest === undefined ? {} : { note: r.latest }),
      });
    },
    { params: IdParam, body: NoteBody },
  );
