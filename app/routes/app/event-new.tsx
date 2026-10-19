import { requestEventClock } from '@server/event/events.clock';
import { requireUser } from '@server/guard';
import { loadMembership, toPrincipal } from '@server/project/membership.query';
import { listProjects } from '@server/project/project.query';
import { EventForm } from '~/components/events/EventForm';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { newEventValues } from '~/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';
import { eventProjectOptions } from '~/lib/event-form.projects';
import type { Route } from './+types/event-new';

const EVENTS_PATH = '/app/events';
/** Projects offered by the Proyek select, by name; more than this is rare in a family team. */
const PROJECT_OPTION_LIMIT = 100;

export function meta() {
  return [{ title: 'Event baru — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const clock = requestEventClock();
  const listed = await listProjects(principal, {
    scope: 'all',
    sort: 'name',
    limit: PROJECT_OPTION_LIMIT,
    offset: 0,
    now: clock.now,
  });
  const memberships = await loadMembership(
    principal.id,
    listed.items.map((p) => p.id),
  );
  return {
    // "Today" and the zone come from the server, never from the browser's clock (R03 D9).
    today: clock.today,
    timeZone: clock.timeZone,
    projects: eventProjectOptions(principal, listed.items, memberships),
  };
}

/** Event baru: two stages, the four basics first and the details behind "Tambahkan rincian". */
export default function EventNewPage({ loaderData }: Route.ComponentProps) {
  return (
    <PageContainer size="narrow">
      <PageHeader
        title={COPY.pageTitle}
        description={COPY.pageDescription}
        back={{ to: EVENTS_PATH, label: COPY.back }}
      />
      <EventForm
        initial={newEventValues(loaderData.today)}
        projects={loaderData.projects}
        timeZone={loaderData.timeZone}
        cancelTo={EVENTS_PATH}
      />
    </PageContainer>
  );
}
