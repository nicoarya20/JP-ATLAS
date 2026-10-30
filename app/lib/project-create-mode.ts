/**
 * Which step of "Buat proyek" `/app/projects/new` shows. One route serves every step so the frozen
 * page-URL list of `contract-v1` does not grow: the chooser is the bare URL, the form is `?cara=form`,
 * story-mode is `?cara=cerita` and template-mode is `?cara=template` (plan §9.1 — the values the
 * comment above used to reserve for them before they were built).
 */
export type CreateMode = 'choose' | 'form' | 'cerita' | 'template';

export const PROJECT_CHOOSER_PATH = '/app/projects/new';
export const PROJECT_FORM_HREF = `${PROJECT_CHOOSER_PATH}?cara=form`;
export const PROJECT_STORY_HREF = `${PROJECT_CHOOSER_PATH}?cara=cerita`;
export const PROJECT_TEMPLATE_HREF = `${PROJECT_CHOOSER_PATH}?cara=template`;

/**
 * `?cara=form|cerita|template` opens the matching step. Everything else — no value, an empty one, or
 * a typo — shows the chooser, so a stale link can never open half a feature.
 */
export function createModeOf(search: URLSearchParams): CreateMode {
  const cara = search.get('cara');
  return cara === 'form' || cara === 'cerita' || cara === 'template' ? cara : 'choose';
}
