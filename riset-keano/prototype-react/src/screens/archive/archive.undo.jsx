// Archive ③ Undo after archive: the Events list with an Undo snackbar for the event just archived (screen params
// {event}). Undo puts it back and leaves the plain list; opened with nothing archived, there is no snackbar.
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Snack } from '../../kit';
import { EventsList } from '../events/events.list';
import { restoreEvent } from '../events/events.store';

export default function ArchiveUndo() {
  const { params, go, toast } = useApp();
  const id = params.event;
  const archived = id != null && D.archive.some(a => a.event === id);
  const undo = () => {
    restoreEvent(id);
    toast('Event restored');
    go('events.list', { top: true });
  };
  return <EventsList overlay={archived && <Snack action="Undo" onAction={undo}>Event moved to Archive</Snack>} />;
}
