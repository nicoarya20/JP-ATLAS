// What the round "+" next to the tab pill creates (prototype kit/layout.jsx CREATE, CREATE_MENU, createFor).
import type { Role } from '@/data/sample/people';

import { allowedScreen, type ScreenId } from './screen-roles';
import type { TabId } from './tabs.config';

/** go = prototype screen id the "+" opens; label = its accessibility label. */
export type CreateTarget = { go: ScreenId; label: string };

/** Each tab's own "new" screen. */
export const CREATE: Partial<Record<TabId, CreateTarget>> = {
  tasks: { go: 'tasks.write', label: 'New task' },
  projects: { go: 'projects.new', label: 'New project' },
  events: { go: 'events.new', label: 'New event' },
};

/** Home and More have no "new" of their own, so their "+" opens the Create sheet to pick from. */
export const CREATE_MENU: CreateTarget = { go: 'home.create', label: 'Create' };

/** The "+" target for a tab, or null when the role can't open that tab's "new" screen (Member on Projects). */
export function createFor(tab: TabId, role: Role): CreateTarget | null {
  const target = CREATE[tab];
  if (!target) return CREATE_MENU;
  return allowedScreen(target.go, role) ? target : null;
}
