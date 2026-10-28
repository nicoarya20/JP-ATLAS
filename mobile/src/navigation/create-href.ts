// Where each create target lives in the route tree (registered in app/_layout.tsx, docs/phase1-navigation.md §4.5).
import type { Href } from 'expo-router';

/** The screens the "+" and the Create sheet open: prototype screen id → route. */
export const CREATE_ROUTES = {
  'home.create': '/create',
  'tasks.write': '/tasks/new',
  'projects.new': '/projects/new',
  'events.new': '/events/new',
  'tasks.csv': '/tasks/csv',
} as const satisfies Record<string, Href>;

export type CreateGo = keyof typeof CREATE_ROUTES;

/** The route of a create target. */
export const createHref = (go: CreateGo): Href => CREATE_ROUTES[go];
