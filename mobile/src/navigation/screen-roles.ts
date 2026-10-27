// Which role may open which prototype screen (core/registry.js `allowed`, with the `roles` of each screens/*/index.js).
// Phase 1 only hides entries and redirects deep links in the UI; the server enforces roles in Phase 2.
import type { Role } from '@/data/sample/people';

/** The prototype's screen and sheet ids (test/screens.ids.js), less settings.leave (leave was dropped). */
// biome-ignore format: one prototype group per line
export const SCREEN_IDS = [
  'auth.login', 'auth.account', 'auth.pending', 'auth.denied',
  'home.main', 'home.search', 'home.create',
  'projects.list', 'projects.filter', 'projects.new', 'projects.form', 'projects.story', 'projects.draft',
  'projects.template', 'projects.overview', 'projects.tasks', 'projects.phases', 'projects.members',
  'projects.extend', 'projects.edit', 'projects.archive',
  'tasks.my', 'tasks.filter', 'tasks.all', 'tasks.board', 'tasks.empty', 'tasks.write', 'tasks.form', 'tasks.csv',
  'tasks.detail-todo', 'tasks.detail-progress', 'tasks.detail-review', 'tasks.edit', 'tasks.return',
  'tasks.cancel', 'tasks.settings',
  'events.list', 'events.filter', 'events.calendar', 'events.new', 'events.new-details', 'events.empty',
  'events.detail-upcoming', 'events.detail-recurring', 'events.record-ready', 'events.recording',
  'events.step1', 'events.step2', 'events.step3', 'events.detail-confirmed',
  'events.cancel', 'events.archive', 'events.cancel-recurring', 'events.archive-recurring',
  'inbox.respond', 'inbox.updates', 'inbox.empty',
  'team.list', 'team.person', 'team.empty',
  'archive.list', 'archive.empty', 'archive.undo', 'archive.delete',
  'users.approve', 'users.roles',
  'settings.main', 'settings.profile',
  'profile.me', 'profile.calendar',
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

const MANAGERS: readonly Role[] = ['pm', 'admin'];
const ADMIN: readonly Role[] = ['admin'];
const MEMBER: readonly Role[] = ['member'];

/** Screens closed to some roles; every other id is open to all three. */
const ROLES_OF: Partial<Record<ScreenId, readonly Role[]>> = {
  'tasks.return': MANAGERS,
  'projects.new': MANAGERS,
  'projects.form': MANAGERS,
  'projects.story': MANAGERS,
  'projects.draft': MANAGERS,
  'projects.template': MANAGERS,
  'projects.extend': MANAGERS,
  'projects.edit': MANAGERS,
  'projects.archive': MANAGERS,
  'users.approve': ADMIN,
  'users.roles': ADMIN,
  'archive.delete': ADMIN,
  'events.empty': MEMBER,
  'team.empty': MEMBER,
};

const KNOWN = new Set<string>(SCREEN_IDS);

/** True when `id` is a known screen and `role` may open it; unknown ids are never allowed. */
export function allowedScreen(id: string, role: Role): boolean {
  if (!KNOWN.has(id)) return false;
  const roles = ROLES_OF[id as ScreenId];
  return !roles || roles.includes(role);
}
