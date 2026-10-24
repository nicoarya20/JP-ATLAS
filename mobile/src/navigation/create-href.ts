// Where each create target lives in the route tree (registered in app/_layout.tsx, docs/phase1-navigation.md §4.5).
import type { Href } from 'expo-router';

import type { ScreenId } from './screen-roles';

/** The screens the "+" and the Create sheet open: prototype screen id → route. */
export const CREATE_ROUTES = {
  'home.create': '/create',
  'tasks.write': '/tasks/new',
  'projects.new': '/projects/new',
  'events.new': '/events/new',
  'tasks.csv': '/tasks/csv',
  'settings.leave': '/leave',
} as const satisfies Partial<Record<ScreenId, string>>;

export type CreateGo = keyof typeof CREATE_ROUTES;

/**
 * The route of a create target. Typed routes only know route files that exist, and the module workers add these files
 * in Phase 1 (the Stack already registers them), so the path is widened to Href here, once.
 */
export const createHref = (go: CreateGo): Href => CREATE_ROUTES[go] as Href;
