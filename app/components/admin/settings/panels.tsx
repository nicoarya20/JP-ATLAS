import type { ComponentType } from 'react';
import { IdentitasPanel } from './identitas.panel';

/**
 * Real panels of /dashboard/settings, by tab value. A tab absent from here still renders the
 * preview from `settings.previews.tsx`, else the placeholder from `settings.tabs.ts`, so tabs can
 * be filled one task at a time without touching the page: a task adds its component file plus one
 * line below, deletes its preview in the same commit, and nothing else.
 *
 * Identitas is the first one filled (P13 RD-03); Pengumuman, Akses masuk, Pemberitahuan and Fitur
 * follow in RD-05..RD-09.
 */
export const SETTINGS_PANELS: Partial<Record<string, ComponentType>> = {
  identitas: IdentitasPanel,
};

/** True while the tab still shows its placeholder — the shell and its test share this answer. */
export function isPlaceholderTab(value: string): boolean {
  return !SETTINGS_PANELS[value];
}
