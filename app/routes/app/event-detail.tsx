import { requestEventClock } from '@server/event/events.clock';
import { getEvent } from '@server/event/events.query';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { useQuery } from '@tanstack/react-query';
import { data } from 'react-router';
import { EventDetailView } from '~/components/events/EventDetailView';
import { DETAIL_COPY } from '~/components/events/event-detail.copy';
import { type EventDetail, eventKeys, fetchEvent } from '~/lib/events-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/event-detail';

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.event.title;
  return [{ title: `${title ?? DETAIL_COPY.fallbackTitle} — Simple PM` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const clock = requestEventClock();
  const res = await getEvent(toPrincipal(actor), params.id);
  // Missing, in the Trash and hidden from this viewer all answer the same friendly 404 (D8).
  if (!res.ok) throw data(DETAIL_COPY.notFound, { status: 404 });
  return {
    event: toJson<EventDetail>(res.event),
    clock: { now: clock.now.getTime(), today: clock.today, timeZone: clock.timeZone },
    loadedAt: Date.now(),
  };
}

/** One event: when, where, guests, and the Batalkan / Hapus actions the server allows. */
export default function EventDetailPage({ loaderData, params }: Route.ComponentProps) {
  // Every event write invalidates `eventKeys.all`, so a cancel refetches and the page turns Dibatalkan.
  const { data: event } = useQuery({
    queryKey: eventKeys.detail(params.id),
    queryFn: () => fetchEvent(params.id),
    initialData: loaderData.event,
    initialDataUpdatedAt: loaderData.loadedAt,
  });
  return <EventDetailView event={event} clock={loaderData.clock} />;
}
