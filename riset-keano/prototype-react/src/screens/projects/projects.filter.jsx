// Projects ①b: the Filter & sort overlay (full-height, same as Tasks and Events) opened from the icon next to the search field.
// The query lives in the list screen's params (projects.query); Apply re-opens the list with it.
import { useState } from 'react';
import { Radio } from '@react-cupertino-ui/radio';
import { Chips, FilterPanel, Label, SearchFilter } from '../../kit';
import { useApp } from '../../core/app.context';
import { BASE_QUERY, HEALTHS, SORTS, STATUSES, isFiltered, queryOf } from './projects.query';

/** Search field with the Filter & sort icon; its dot shows when the list's query filters the projects. */
export function ProjectsSearch() {
  const { params, openSheet } = useApp();
  return <SearchFilter placeholder="Search project name or description…" on={isFiltered(queryOf(params))}
    onFilter={() => openSheet('projects.filter')} />;
}

/** ①b Filter & sort: status and health filters, then the sort order, edited as a draft. Reset puts the draft back to the
 *  default; Apply re-opens the list underneath with the draft as its params, which closes the overlay. */
export function ProjectsFilter() {
  const { current, params: screen, go } = useApp();
  const [draft, setDraft] = useState(() => queryOf(screen));
  const [resets, setResets] = useState(0);   // remounts the chip rows, which keep their own picked index
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const reset = () => { setDraft(BASE_QUERY); setResets(n => n + 1); };
  return (
    <FilterPanel onReset={reset} onApply={() => go(current, { params: { ...screen, ...draft } })}>
      <div className="field">
        <Label>Status</Label>
        <Chips key={`status-${resets}`} items={STATUSES} on={draft.status} onPick={i => set({ status: i })} />
      </div>
      <div className="field">
        <Label>Health</Label>
        <Chips key={`health-${resets}`} items={HEALTHS} on={draft.health} onPick={i => set({ health: i })} />
      </div>
      <div className="field">
        <Label>Sort by</Label>
        <div className="stack sm" role="radiogroup" aria-label="Sort by">
          {SORTS.map((s, i) => <Radio key={s} variant="solid" name="pj-sort" size="sm" label={s}
            checked={draft.sort === i} onChange={() => set({ sort: i })} />)}
        </div>
      </div>
    </FilterPanel>
  );
}
