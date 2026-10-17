/**
 * Where "← Kembali" on a task detail goes when there is no in-app history (direct visit, new tab):
 * the task list the user came from, with its filters, or the Tugas page.
 */
export const TASK_LIST_PATH = '/app/tasks';
/** Query parameter a link may set to name the list to return to (a same-site path). */
export const BACK_PARAM = 'dari';

// Only the task lists qualify, so a crafted `?dari=` or referrer can never send the user elsewhere.
const LIST_PATHS = [/^\/app\/tasks\/?$/, /^\/app\/projects\/[^/]+\/tasks\/?$/];

/** The path + query of `candidate` when it is a same-origin task list, else null. */
function listPath(candidate: string | null, origin: string): string | null {
  // Not a URL at all counts as absent: the fallback list is always safe.
  if (!candidate || !URL.canParse(candidate, origin)) return null;
  const url = new URL(candidate, origin);
  if (url.origin !== origin || !LIST_PATHS.some((re) => re.test(url.pathname))) return null;
  return `${url.pathname}${url.search}`;
}

/** Back target from `?dari=` first, then the Referer header, then the Tugas page. */
export function taskBackPath(requestUrl: string, referer: string | null): string {
  const url = new URL(requestUrl);
  return (
    listPath(url.searchParams.get(BACK_PARAM), url.origin) ??
    listPath(referer, url.origin) ??
    TASK_LIST_PATH
  );
}
