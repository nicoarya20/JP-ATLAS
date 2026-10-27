/**
 * Preview panels of /dashboard/settings, by tab value — the screens that show the *shape* of a
 * tab before its task is built (P11 AD-04..AD-08, P9 G-02). They are deliberately kept apart from
 * `SETTINGS_PANELS`: a preview reads nothing and saves nothing, so `isPlaceholderTab()` must keep
 * saying "unfilled" for a tab that only has one, and the owner register in `settings.tabs.ts`
 * stays the truth about what is left to build.
 *
 * The page prefers a real panel, falls back to the preview, and falls back again to the plain
 * EmptyState. Filling a tab for real therefore means: register the panel in `panels.tsx`, delete
 * the preview file, and delete its line here — the test in `tests/admin-pratinjau.test.ts` fails
 * until all three are done together.
 */
import type { ComponentType } from 'react';
import { PemberitahuanPreview } from './pemberitahuan';

export const SETTINGS_PREVIEWS: Partial<Record<string, ComponentType>> = {
  pemberitahuan: PemberitahuanPreview,
};
