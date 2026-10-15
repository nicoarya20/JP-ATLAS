// Trash ③ Undo after delete: the Events list with an Undo snackbar.
import { Snack } from '../../kit';
import { EventsList } from '../events/events.list';

export default function TrashUndo() {
  return (
    <EventsList overlay={(
      <Snack action="Undo" go="events.detail-upcoming" toast="Event restored">Event moved to Trash</Snack>
    )} />
  );
}
