import type { DummyProject, ProjectSort, StatusFilter } from './projects.dummy';

const pct = (p: DummyProject) => (p.total === 0 ? 0 : p.done / p.total);

/** Applies search text, the status chip and the sort order to the project list. */
export function filterProjects(
  rows: readonly DummyProject[],
  q: string,
  status: StatusFilter,
  sort: ProjectSort,
): DummyProject[] {
  const needle = q.trim().toLowerCase();
  const kept = rows.filter((p) => {
    if (needle && !`${p.name} ${p.lead}`.toLowerCase().includes(needle)) return false;
    if (status === 'all') return true;
    if (status === 'attention') return p.condition !== 'on_track';
    return p.status === status;
  });
  return kept.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'id');
    if (sort === 'progress') return pct(b) - pct(a);
    return a.due.localeCompare(b.due);
  });
}
