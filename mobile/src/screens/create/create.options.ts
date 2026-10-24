// The rows of the Create sheet (prototype screens/home/home.create.jsx OPTIONS): everything a person can add.
import {
  CalendarPlus,
  FileUp,
  FolderPlus,
  ListPlus,
  type LucideIcon,
  Plane,
} from 'lucide-react-native';

import type { Role } from '@/data/sample/people';
import type { CreateGo } from '@/navigation/create-href';
import { allowedScreen } from '@/navigation/screen-roles';

export const CREATE_SHEET = { title: 'Create', sub: 'What do you want to add?' } as const;

/** Tile colour behind a row's icon (prototype .hm-tile blue/green/orange/gray). */
export type CreateTone = 'blue' | 'green' | 'orange' | 'gray';

export type CreateOption = {
  go: CreateGo;
  title: string;
  sub: string;
  Icon: LucideIcon;
  tone: CreateTone;
};

/**
 * Leave's title follows the role: a Member or PM requests it, an Admin sets it (prototype settings.leave.jsx
 * LEAVE[role].title).
 * TODO(settings): read it from the settings module's LEAVE once settings.leave is ported in Phase 1, so the two
 * cannot drift.
 */
const LEAVE_TITLE: Record<Role, string> = {
  member: 'Request leave',
  pm: 'Request leave',
  admin: 'Set leave',
};

const OPTIONS = (role: Role): CreateOption[] => [
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
  },
  {
    go: 'events.new',
    title: 'Event',
    sub: 'Meeting, review or team event',
    Icon: CalendarPlus,
    tone: 'orange',
  },
  {
    go: 'tasks.csv',
    title: 'Import tasks',
    sub: 'Add many tasks from a CSV file',
    Icon: FileUp,
    tone: 'gray',
  },
  {
    go: 'settings.leave',
    title: LEAVE_TITLE[role],
    sub: 'Days you will be away',
    Icon: Plane,
    tone: 'gray',
  },
];

/** The rows `role` may open; the rest are left out (a Member sees no Project). */
export const createOptions = (role: Role) =>
  OPTIONS(role).filter((option) => allowedScreen(option.go, role));
