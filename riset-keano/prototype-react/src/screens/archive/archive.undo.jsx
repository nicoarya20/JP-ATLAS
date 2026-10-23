// Archive ③ Undo after archive: the list the archived item came from, with an Undo snackbar for it (screen params
// {event}, {task} or {project}). Undo puts it back and leaves the plain list; opened with nothing archived, there is no
// snackbar (the Events list, as before).
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Snack } from '../../kit';
import { EventsList } from '../events/events.list';
import { restoreEvent } from '../events/events.store';
import { TasksAll } from '../tasks/tasks.list';
import { unarchiveTask } from '../tasks/tasks.store';
import ProjectsList from '../projects/projects.list';
import { restoreProject } from '../projects/projects.store';

/** Per kind: the params key, the list it lands on, how Undo puts it back, and the snackbar and toast texts. */
const KINDS = [
  { key: 'project', List: ProjectsList, list: 'projects.list', restore: restoreProject, moved: 'Project moved to Archive', back: 'Project restored' },
  { key: 'task', List: TasksAll, list: 'tasks.all', restore: unarchiveTask, moved: 'Task moved to Archive', back: 'Task restored' },
  { key: 'event', List: EventsList, list: 'events.list', restore: restoreEvent, moved: 'Event moved to Archive', back: 'Event restored' },
];

export default function ArchiveUndo() {
  const { params, go, toast } = useApp();
  const k = KINDS.find(x => params[x.key] != null) || KINDS.at(-1);
  const id = params[k.key];
  const archived = id != null && D.archive.some(a => a[k.key] === id);
  const undo = () => {
    k.restore(id);
    toast(k.back);
    go(k.list, { top: true });
  };
  const { List } = k;
  return <List params={{}} overlay={archived && <Snack action="Undo" onAction={undo}>{k.moved}</Snack>} />;
}
