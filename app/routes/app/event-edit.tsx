import { Alert } from '@mantine/core';
import { capMessage } from '@server/access/capabilities';
import { requestEventClock } from '@server/event/events.clock';
import { getEvent } from '@server/event/events.query';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { FiLock } from 'react-icons/fi';
import { data } from 'react-router';
import { EventForm } from '~/components/events/EventForm';
import { DETAIL_COPY } from '~/components/events/event-detail.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';
import { editEventValues } from '~/lib/event-form.edit';
import { type EventDetail, eventHref } from '~/lib/events-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/event-edit';

export function meta() {
  return [{ title: 'Ubah Acara — Simple PM' }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  // Page loaders run in parallel with the layout's, so this page guards itself (tests/app-routes).
  const actor = await requireUser(request);
  const clock = requestEventClock();
  const res = await getEvent(toPrincipal(actor), params.id);
  // Missing, in the Trash and hidden from this viewer all answer the same friendly 404 as the detail.
  if (!res.ok) throw data(DETAIL_COPY.notFound, { status: 404 });
  const event = toJson<EventDetail>(res.event);
  const detail = eventHref(event.id);
  // The viewer can open the event (a hidden one was a 404 above), so a refusal gets its reason.
  if (event.can.update !== true) {
    const reason = event.can.update ? capMessage(event.can.update) : COPY.editForbidden;
    return data({ allowed: false as const, reason, detail }, { status: 403 });
  }
  return {
    allowed: true as const,
    id: event.id,
    detail,
    initial: editEventValues(event, clock.timeZone),
    // The project and the guest list cannot change here, so they are read out, not offered.
    locked: {
      projectName: event.project?.name ?? null,
      participants: event.participants.map((p) => p.name),
    },
    timeZone: clock.timeZone,
  };
}

/** Ubah acara: the create form in edit mode, with project and guests read-only (the route refuses them). */
export default function EventEditPage({ loaderData }: Route.ComponentProps) {
  if (!loaderData.allowed) {
    return (
      <PageContainer size="narrow">
        <PageHeader
          title={COPY.editTitle}
          back={{ to: loaderData.detail, label: COPY.backToEvent }}
        />
        <Alert color="gray" variant="light" icon={<FiLock size="1.25em" aria-hidden />}>
          {loaderData.reason}
        </Alert>
      </PageContainer>
    );
  }
  return (
    <PageContainer size="narrow">
      <PageHeader
        title={COPY.editTitle}
        description={COPY.editDescription}
        back={{ to: loaderData.detail, label: COPY.backToEvent }}
      />
      <EventForm
        eventId={loaderData.id}
        initial={loaderData.initial}
        locked={loaderData.locked}
        projects={[]}
        timeZone={loaderData.timeZone}
        cancelTo={loaderData.detail}
      />
    </PageContainer>
  );
}
