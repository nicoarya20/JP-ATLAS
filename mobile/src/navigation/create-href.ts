// Where each create target lives in the route tree (registered in app/_layout.tsx, docs/phase1-navigation.md §4.5).
import type { Href } from 'expo-router';

import { routeHref } from './route-href';
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

/** The route of a create target (its file arrives with its module, see routeHref). */
export const createHref = (go: CreateGo): Href => routeHref(CREATE_ROUTES[go]);
