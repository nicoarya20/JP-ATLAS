/** The Events page body: header, filters and list; everything it shows comes from the loader. */
import { Stack } from '@mantine/core';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { EventsSeed } from '~/lib/events-api';
import { clearEventFiltersPatch, parseEventFilters } from '~/lib/events-filters';
import type { EventsClock } from '~/lib/events-format';
import { useUrlFilters } from '~/lib/use-url-filters';
import { CreateEventButton } from './CreateEventButton';
import { EventFilters, type EventOption } from './EventFilters';
import { EventList } from './EventList';
import { EVENTS_COPY } from './events.copy';

export type EventsViewProps = {
  seed: EventsSeed;
  clock: EventsClock;
  /** `caps.createEvent` from the server; the button is absent without it. */
  canCreate: boolean;
  projects: EventOption[];
};

export function EventsView({ seed, clock, canCreate, projects }: EventsViewProps) {
  const { filters, setFilters } = useUrlFilters(parseEventFilters);
  return (
    <PageContainer>
      <PageHeader
        title={EVENTS_COPY.title}
        description={EVENTS_COPY.description}
        actions={<CreateEventButton canCreate={canCreate} />}
      />
      <Stack gap="lg">
        <EventFilters filters={filters} projects={projects} onChange={setFilters} />
        <EventList
          filters={filters}
          seed={seed}
          clock={clock}
          canCreate={canCreate}
          onResetFilters={() => setFilters(clearEventFiltersPatch())}
        />
      </Stack>
    </PageContainer>
  );
}
