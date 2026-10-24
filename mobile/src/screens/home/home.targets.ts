import type { Href } from 'expo-router';

import type { HomeTarget } from '@/data/home.types';

/** Where each prototype screen id a Home chip or link names lives in the app. */
export const TARGET_HREF: Record<HomeTarget, Href> = {
  'tasks.all': '/tasks?scope=all',
  'tasks.my': '/tasks?scope=mine',
  'projects.list': '/projects',
  'users.approve': '/more/users',
  'events.calendar': '/events?view=calendar',
  'inbox.respond': '/more/inbox',
};

/** A task row opens the task. */
export const taskHref = (no: number): Href => `/tasks/${no}`;

/** A project row opens the project. */
export const projectHref = (id: string): Href => `/projects/${id}`;
