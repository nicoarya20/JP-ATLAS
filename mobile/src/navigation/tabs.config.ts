// Bottom tabs of the prototype (riset-keano/prototype-react/src/kit/layout.jsx TABS), as routes of app/(tabs).
import {
  CalendarDays,
  CircleCheck,
  Ellipsis,
  FolderKanban,
  House,
  type LucideIcon,
} from 'lucide-react-native';

export type TabId = 'home' | 'tasks' | 'projects' | 'events' | 'more';

/**
 * One tab. route = its route name in app/(tabs) (a folder with its own Stack); root = the prototype screen id the
 * tab opens (docs/phase1-navigation.md), null for More, which unfolds the More panel instead of opening a screen.
 */
export type TabDef = {
  id: TabId;
  label: string;
  route: string;
  root: string | null;
  Icon: LucideIcon;
};

/** The tab whose press opens the More panel instead of switching screens. */
export const MORE_ID: TabId = 'more';

/** Tabs in bar order. Labels are for screen readers only; the bar shows the icons. */
export const TABS: readonly TabDef[] = [
  { id: 'home', label: 'Home', route: '(home)', root: 'home.main', Icon: House },
  { id: 'tasks', label: 'Tasks', route: 'tasks', root: 'tasks.my', Icon: CircleCheck },
  {
    id: 'projects',
    label: 'Projects',
    route: 'projects',
    root: 'projects.list',
    Icon: FolderKanban,
  },
  { id: 'events', label: 'Events', route: 'events', root: 'events.list', Icon: CalendarDays },
  { id: MORE_ID, label: 'More', route: 'more', root: null, Icon: Ellipsis },
];

/** The tab drawn for a route name of app/(tabs), or undefined for a name that is not a tab. */
export function tabOfRoute(route: string): TabDef | undefined {
  return TABS.find((t) => t.route === route);
}
