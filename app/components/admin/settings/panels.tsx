import type { ComponentType } from 'react';

/**
 * Real panels of /dashboard/settings, by tab value. A tab absent from here still renders the
 * placeholder from `settings.tabs.ts`, so tabs can be filled one task at a time without touching
 * the page: a task adds its component file plus one line below, and nothing else.
 *
 * Empty again since AD-20: the only two panels that had landed, Peran & izin and Ekspor data, are
 * now menus of their own (/dashboard/permissions, /dashboard/export). The six remaining tabs are
 * filled by AD-04..AD-08 and P9 G-02.
 */
export const SETTINGS_PANELS: Partial<Record<string, ComponentType>> = {};

/** True while the tab still shows its placeholder — the shell and its test share this answer. */
export function isPlaceholderTab(value: string): boolean {
  return !SETTINGS_PANELS[value];
}
