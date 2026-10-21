import type { ComponentType } from 'react';
import { EksporDataPanel } from './panels/ekspor-data';
import { PeranIzinPanel } from './panels/peran-izin';

/**
 * Real panels of /dashboard/settings, by tab value. A tab absent from here still renders the
 * placeholder from `settings.tabs.ts`, so tabs can be filled one task at a time without touching
 * the page: a task adds its component file plus one line below, and nothing else.
 */
export const SETTINGS_PANELS: Partial<Record<string, ComponentType>> = {
  'peran-izin': PeranIzinPanel, // AD-09
  'ekspor-data': EksporDataPanel, // AD-10
};

/** True while the tab still shows its placeholder — the shell and its test share this answer. */
export function isPlaceholderTab(value: string): boolean {
  return !SETTINGS_PANELS[value];
}
