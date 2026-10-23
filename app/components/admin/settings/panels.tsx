import type { ComponentType } from 'react';
import { FiturPanel } from './fitur.panel';
import { IdentitasPanel } from './identitas.panel';

/**
 * Real panels of /dashboard/settings, by tab value. A tab absent from here still renders the
 * preview from `settings.previews.tsx`, else the placeholder from `settings.tabs.ts`, so tabs can
 * be filled one task at a time without touching the page: a task adds its component file plus one
 * line below, deletes its preview in the same commit, and nothing else.
 *
 * Emptied by AD-20 — the only two panels that had landed, Peran & izin and Ekspor data, are now
 * menus of their own (/dashboard/permissions, /dashboard/export) — and refilled one task at a
 * time since: Identitas by RD-03 and Fitur by RD-09; Pengumuman, Akses masuk and Pemberitahuan
 * follow in RD-05..RD-08.
 */
export const SETTINGS_PANELS: Partial<Record<string, ComponentType>> = {
  identitas: IdentitasPanel,
  fitur: FiturPanel,
};

/** True while the tab still shows its placeholder — the shell and its test share this answer. */
export function isPlaceholderTab(value: string): boolean {
  return !SETTINGS_PANELS[value];
}
