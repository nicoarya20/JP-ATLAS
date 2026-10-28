// The rows of the Create sheet (prototype screens/home/home.create.jsx OPTIONS): everything a person can add, as the
// server's app-wide `caps` (`GET /api/app/whoami`) allow.
import { CalendarPlus, FileUp, FolderPlus, ListPlus, type LucideIcon } from 'lucide-react-native';

import type { AppCapsWire } from '@/data/whoami.api';
import type { CreateGo } from '@/navigation/create-href';

export const CREATE_SHEET = { title: 'Create', sub: 'What do you want to add?' } as const;

/** Tile colour behind a row's icon (prototype .hm-tile blue/green/orange/gray). */
export type CreateTone = 'blue' | 'green' | 'orange' | 'gray';

export type CreateOption = {
  go: CreateGo;
  title: string;
  sub: string;
  Icon: LucideIcon;
  tone: CreateTone;
  /** The cap the row needs; none = anyone signed in (a task's project is checked by the task form). */
  cap?: (caps: AppCapsWire) => boolean;
};

const OPTIONS: readonly CreateOption[] = [
  {
    go: 'tasks.write',
    title: 'Task',
    sub: 'Just write it or fill a form',
    Icon: ListPlus,
    tone: 'blue',
  },
  {
    go: 'projects.new',
    title: 'Project',
    sub: 'From a story, a template or a form',
    Icon: FolderPlus,
    tone: 'green',
    cap: (c) => c.createProject,
  },
  {
    go: 'events.new',
    title: 'Event',
    sub: 'Meeting, review or team event',
    Icon: CalendarPlus,
    tone: 'orange',
    cap: (c) => c.createEvent,
  },
  {
    // Hidden: no server route imports tasks yet (gap doc §3, CSV).
    go: 'tasks.csv',
    title: 'Import tasks',
    sub: 'Add many tasks from a CSV file',
    Icon: FileUp,
    tone: 'gray',
    cap: () => false,
  },
];

/** The rows `caps` allow; none while they are not in (null). */
export const createOptions = (caps: AppCapsWire | null): CreateOption[] =>
  caps ? OPTIONS.filter((option) => !option.cap || option.cap(caps)) : [];
