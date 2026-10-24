import type { Href } from 'expo-router';

import type { HomeTarget } from '@/data/home.types';

/** What a Home element opens: the prototype's screen ids, plus the detail screens its rows open. */
export type OpenTarget =
  | HomeTarget
  | 'home.search'
  | 'tasks.detail'
  | 'projects.overview'
  | 'events.detail';

/**
 * Phase 0 has only the five tabs, so every target lands on the tab that will hold its screen (the detail screens come
 * with their modules in Phase 1). Search has no tab: null, and Home says it arrives later.
 */
export function tabFor(target: OpenTarget): Href | null {
  if (target === 'home.search') return null;
  if (target.startsWith('tasks.')) return '/tasks';
  if (target.startsWith('projects.')) return '/projects';
  if (target.startsWith('events.')) return '/events';
  return '/more';
}
