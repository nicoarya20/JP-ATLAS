// Tasks ①b: one Filter & sort overlay (full-height, like the profile) opened from the icon next to the search field;
// it replaces the status chips and the Filter / Sort pills. The query lives in the list screen's params (tasks.query).
import { useState } from 'react';
import { Radio } from '@react-cupertino-ui/radio';
import { Chips, FilterPanel, Label, SearchFilter, Select } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { ASSIGNEES, PRIORITIES, SORTS, STATUSES, baseQuery, isFiltered, queryOf } from './tasks.query';

const PROJECTS = () => [{ value: '', label: 'All projects' }, ...D.projects.map(p => ({ value: p.id, label: p.name }))];

/** Search field with the Filter & sort icon; its dot shows when the list's query filters it.
 *  mine = the list shows my tasks (its default query spans every project, All tasks defaults to Atlas).
 *  inProject = a project's Tasks tab: the project is fixed, so the overlay swaps the Project field for Assignee. */
export function TasksSearch({ mine, inProject }) {
  const { params, openSheet } = useApp();
  return <SearchFilter placeholder="Search title, #number, or tag…" on={isFiltered(queryOf(params, mine, inProject))}
    onFilter={() => openSheet('tasks.filter', { mine: !!mine, inProject: !!inProject })} />;
}

/** ①b Filter & sort: status, project (or, inside a project, assignee) and priority filters, then the sort order, edited
 *  as a draft. Reset puts the draft back to the list's default; Apply re-opens the list underneath with the draft as its
 *  params, which closes the overlay. */
export function TasksFilter({ params }) {
  const mine = !!params?.mine, inProject = !!params?.inProject;
  const { current, params: screen, go } = useApp();
  const [draft, setDraft] = useState(() => queryOf(screen, mine, inProject));
  const [resets, setResets] = useState(0);   // remounts the chip rows, which keep their own picked index
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const reset = () => { setDraft(baseQuery(mine, inProject)); setResets(n => n + 1); };
  return (
    <FilterPanel onReset={reset} onApply={() => go(current, { params: { ...screen, ...draft } })}>
      <div className="field">
        <Label>Status</Label>
        <Chips key={`status-${resets}`} items={STATUSES} on={draft.status} onPick={i => set({ status: i })} />
      </div>
      {inProject ? (
        <div className="field">
          <Label>Assignee</Label>
          <Chips key={`who-${resets}`} items={ASSIGNEES} on={draft.who} onPick={i => set({ who: i })} />
        </div>
      ) : (
        <div className="field">
          <Label>Project</Label>
          <Select block label="Project" options={PROJECTS()} value={draft.project} onChange={v => set({ project: v })} />
        </div>
      )}
      <div className="field">
        <Label>Priority</Label>
        <Chips key={`priority-${resets}`} items={PRIORITIES} on={draft.priority} onPick={i => set({ priority: i })} />
      </div>
      <div className="field">
        <Label>Sort by</Label>
        <div className="stack sm" role="radiogroup" aria-label="Sort by">
          {SORTS.map((s, i) => <Radio key={s} variant="solid" name="tk-sort" size="sm" label={s}
            checked={draft.sort === i} onChange={() => set({ sort: i })} />)}
        </div>
      </div>
    </FilterPanel>
  );
}
