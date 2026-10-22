import { appCaps } from '@server/access/capabilities';
import { requestEventClock } from '@server/event/events.clock';
import { listEvents } from '@server/event/events.query';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { listProjects } from '@server/project/project.query';
import { EventsView } from '~/components/events/EventsView';
import type { EventPage, EventsSeed } from '~/lib/events-api';
import { parseEventFilters, toEventQuery } from '~/lib/events-filters';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/events';

/** Projects offered by the Proyek filter, by name; more than this is rare in a family team. */
const PROJECT_OPTION_LIMIT = 100;

export function meta() {
  return [{ title: 'Events — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const eventClock = requestEventClock();
  const query = toEventQuery(parseEventFilters(new URL(request.url).searchParams));
  const canCreate = appCaps(principal).createEvent;
  const [page, projects] = await Promise.all([
    listEvents(principal, { ...query, kind: query.kind ? [query.kind] : undefined }, eventClock),
    listProjects(principal, {
      scope: 'all',
      sort: 'name',
      limit: PROJECT_OPTION_LIMIT,
      offset: 0,
      now: eventClock.now,
    }),
  ]);
  const seed: EventsSeed = {
    query,
    // No cursor is sent, so BAD_CURSOR cannot happen; a failed read is left to the client fetch.
    first: page.ok
      ? toJson<EventPage>({
          items: page.items,
          nextCursor: page.nextCursor,
          caps: { createEvent: canCreate },
        })
      : null,
    loadedAt: Date.now(),
  };
  return {
    seed,
    canCreate,
    clock: {
      now: eventClock.now.getTime(),
      today: eventClock.today,
      timeZone: eventClock.timeZone,
    },
    projects: projects.items.map((p) => ({ value: p.id, label: p.name })),
  };
}

/** Filters only change the query string; react-query fetches, so the loader need not run again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

/** Events: upcoming and past events the viewer may see, grouped by day (list view only). */
export default function EventsPage({ loaderData }: Route.ComponentProps) {
  return <EventsView {...loaderData} />;
}
