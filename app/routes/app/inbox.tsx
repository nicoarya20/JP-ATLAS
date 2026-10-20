import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { bellCounts } from '@server/notification/notification.bell';
import { listInbox } from '@server/notification/notification.query';
import { toPrincipal } from '@server/project/membership.query';
import { InboxView } from '~/components/inbox/InboxView';
import type { InboxLane, InboxPage, InboxSeed } from '~/lib/inbox-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/inbox';

export function meta() {
  return [{ title: 'Inbox — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const now = new Date();
  const firstPage = async (lane: InboxLane) => {
    const page = await listInbox(principal, { lane }, now);
    // No cursor is sent, so BAD_CURSOR cannot happen; a failed read is left to the client fetch.
    return page.ok ? toJson<InboxPage>({ items: page.items, nextCursor: page.nextCursor }) : null;
  };
  const [action, info, counts] = await Promise.all([
    firstPage('action'),
    firstPage('info'),
    bellCounts(principal),
  ]);
  const seed: InboxSeed = { first: { action, info }, counts, loadedAt: now.getTime() };
  return { seed, timeZone: METRICS.TIME_ZONE };
}

/** The tab lives in the query string and react-query fetches, so the loader need not run again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

/** Inbox: the requests waiting for an answer, then the latest news, read from the caller's own cards. */
export default function InboxRoute({ loaderData }: Route.ComponentProps) {
  return <InboxView {...loaderData} />;
}
