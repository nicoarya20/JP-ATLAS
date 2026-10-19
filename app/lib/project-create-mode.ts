/**
 * Which step of "Buat proyek" `/app/projects/new` shows. One route serves both steps so the frozen
 * page-URL list of `contract-v1` does not grow: the chooser is the bare URL, the form is `?cara=form`.
 */
export type CreateMode = 'choose' | 'form';

export const PROJECT_CHOOSER_PATH = '/app/projects/new';
export const PROJECT_FORM_HREF = `${PROJECT_CHOOSER_PATH}?cara=form`;

/**
 * `?cara=form` opens the form. Everything else — no value, an empty one, a typo, or a way that is not
 * built yet (`cerita`, `template`) — shows the chooser, so a stale link can never open half a feature.
 */
export function createModeOf(search: URLSearchParams): CreateMode {
  return search.get('cara') === 'form' ? 'form' : 'choose';
}
