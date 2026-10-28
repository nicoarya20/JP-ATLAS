// What the round "+" next to the tab pill creates (prototype kit/layout.jsx CREATE, CREATE_MENU, createFor), as the
// server's app-wide `caps` (`GET /api/app/whoami`) allow. Until they are in, there is no "+": never a guessed answer.
import type { AppCapsWire } from '@/data/whoami.api';
import { createOptions } from '@/screens/create/create.options';

import type { CreateGo } from './create-href';
import type { TabId } from './tabs.config';

/** go = prototype screen id the "+" opens (its route: createHref); label = its accessibility label. */
export type CreateTarget = { go: CreateGo; label: string };

/** Each tab's own "new" screen. */
export const CREATE: Partial<Record<TabId, CreateTarget>> = {
  tasks: { go: 'tasks.write', label: 'New task' },
  projects: { go: 'projects.new', label: 'New project' },
  events: { go: 'events.new', label: 'New event' },
};

/**
 * The cap a tab's "new" needs. Tasks has none app-wide: who may add a task to which project is each project's
 * `can.createTask`, which the task form checks.
 */
const CREATE_CAP: Partial<Record<TabId, (caps: AppCapsWire) => boolean>> = {
  projects: (c) => c.createProject,
  events: (c) => c.createEvent,
};

/** Home and More have no "new" of their own, so their "+" opens the Create sheet to pick from. */
export const CREATE_MENU: CreateTarget = { go: 'home.create', label: 'Create' };

/** The "+" target for a tab, or null while caps are not in or they don't allow that tab's "new". */
export function createFor(tab: TabId, caps: AppCapsWire | null): CreateTarget | null {
  if (!caps) return null;
  const target = CREATE[tab];
  if (!target) return createOptions(caps).length > 0 ? CREATE_MENU : null;
  const allowed = CREATE_CAP[tab];
  return !allowed || allowed(caps) ? target : null;
}
