import type { Href } from 'expo-router';

import type { HomeTarget } from '@/data/home.types';

/** Where each screen a Home chip or link names lives in the app. */
export const TARGET_HREF: Record<HomeTarget, Href> = {
  'tasks.all': '/tasks?scope=all',
  'tasks.my': '/tasks?scope=mine',
  'projects.list': '/projects',
  'inbox.respond': '/more/inbox',
};

/** A task row opens the task by its number, which is how its screen is addressed. */
export const taskHref = (no: number): Href => `/tasks/${no}`;

/** A project row opens the project. */
export const projectHref = (id: string): Href => `/projects/${id}`;
