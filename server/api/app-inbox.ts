/**
 * Inbox routes (`/api/app/inbox`, S3 I04, P5 §5.4): read your cards, read the bell numbers, mark one
 * card or all news read. There is no route that creates or deletes a card — cards appear because a
 * service called `notify()` and disappear because it resolved them, so a client cannot forge one.
 *
 * Everything is scoped to the caller inside the query layer: a `userId` in the query string is
 * ignored (R12 C-INB-1), and a card belonging to someone else answers the same 404 as a missing id.
 */
import { Elysia, t } from 'elysia';
import { inboxCounts, listInbox, markAllRead, markRead } from '../notification/notification.query';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { CursorQuery, IdParam, oneOf } from './app-common';
import { appContext } from './app-context';

const ListQuery = t.Object({
  ...CursorQuery.properties,
  lane: t.Optional(oneOf(['action', 'info'])),
});

/** Same wording as the task list: the client's answer is to reload the list, not to retry. */
const BAD_CURSOR = {
  error: 'Halaman Inbox tidak dikenali. Muat ulang Inbox dari awal.',
  code: 'BAD_CURSOR',
} as const;

export const inboxApi = new Elysia({ prefix: '/inbox' })
  .use(appContext)
  /**
   * One keyset page of the caller's cards: `{ items, nextCursor }`. `lane=action` is the work queue
   * (open cards only), `lane=info` the news lane. A malformed cursor answers 400 `BAD_CURSOR`.
   */
  .get(
    '/',
    async ({ actor, query, status }) => {
      const result = await listInbox(
        toPrincipal(actor),
        { lane: query.lane ?? 'action', limit: query.limit, cursor: query.cursor },
        new Date(),
      );
      if (!result.ok) return status(400, BAD_CURSOR);
      return { items: result.items, nextCursor: result.nextCursor };
    },
    { query: ListQuery },
  )
  /**
   * The bell: `{ action, infoUnread }`. Excluded from the IP rate limit (`server/rate-limit.ts`)
   * because every open tab polls it every 60 s, and never cached: the numbers are per user.
   */
  .get('/count', async ({ actor }) => inboxCounts(toPrincipal(actor)))
  /** Marks one card read (idempotent); a card that is not the caller's answers the same 404 as a missing one. */
  .post(
    '/:id/read',
    async ({ actor, params, status }) => {
      const found = await markRead(toPrincipal(actor), params.id);
      return found ? { ok: true } : fail(status, 'NOT_FOUND');
    },
    { params: IdParam },
  )
  /** Marks every unread news card read: `{ updated }`. The work queue is untouched. */
  .post('/read-all', async ({ actor }) => ({ updated: await markAllRead(toPrincipal(actor)) }));
