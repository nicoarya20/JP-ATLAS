import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { requestClock } from '@server/task/task.clock';
import { isRefused } from '@server/team/team.dto';
import { getPerson } from '@server/team/team.person.query';
import { data } from 'react-router';
import { TeamDetailView } from '~/components/team/TeamDetailView';
import { DETAIL_COPY, NOT_FOUND_TEXT } from '~/components/team/team.detail.copy';
import { toJson } from '~/lib/loader-json';
import type { PersonDetail } from '~/lib/team-person-api';
import type { Route } from './+types/team-detail';

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.detail.person.name;
  return [{ title: `${name ? `${name} — ` : ''}${DETAIL_COPY.fallbackTitle} — Simple PM` }];
}

// The layout guard does not protect this page's loader (they run in parallel), so it guards itself.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const clock = requestClock();
  const res = await getPerson(toPrincipal(actor), params.userId, clock.now);
  // Only NOT_FOUND is possible: a hidden person and a missing one answer the same 404 (D8).
  if (isRefused(res)) throw data(NOT_FOUND_TEXT, { status: 404 });
  return {
    detail: toJson<PersonDetail>(res),
    // "Today" is the server's, so "terlambat" matches the labels the server counted.
    today: clock.today,
    loadedAt: Date.now(),
  };
}

/** Detail of one person in the team: profile, shared projects and open work. */
export default function TeamDetailPage({ loaderData, params }: Route.ComponentProps) {
  return (
    <TeamDetailView
      userId={params.userId}
      initial={loaderData.detail}
      loadedAt={loaderData.loadedAt}
      today={loaderData.today}
    />
  );
}
