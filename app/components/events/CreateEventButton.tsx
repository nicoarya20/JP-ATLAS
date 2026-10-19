import { Button } from '@mantine/core';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router';
import { NEW_EVENT_PATH } from '~/lib/events-api';
import { EVENTS_COPY } from './events.copy';

/** "Event baru" links to the form; it is absent (not disabled) when the server says the viewer may not create. */
export function CreateEventButton({ canCreate }: { canCreate: boolean }) {
  if (!canCreate) return null;
  return (
    <Button component={Link} to={NEW_EVENT_PATH} leftSection={<FiPlus size="1.25em" aria-hidden />}>
      {EVENTS_COPY.create}
    </Button>
  );
}
