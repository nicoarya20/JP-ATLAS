// Tasks ①b: one Filter & sort overlay (full-height, like the profile) opened from the icon next to the search field;
// it replaces the status chips and the Filter / Sort pills. The query lives in the list screen's params (tasks.query).
import { useState } from 'react';
import { Radio } from '@react-cupertino-ui/radio';
import { SlidersHorizontal } from 'lucide-react';
import { Btn, Chips, Label, Select } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { PRIORITIES, SORTS, STATUSES, baseQuery, isFiltered, queryOf } from './tasks.query';

const PROJECTS = () => [{ value: '', label: 'All projects' }, ...D.projects.map(p => ({ value: p.id, label: p.name }))];

/** Round filter icon on the right of the search field; a dot shows when the list's query filters it.
 *  mine = the list shows my tasks (its default query spans every project, All tasks defaults to Atlas). */
export function FilterButton({ mine }) {
  const { params, openSheet } = useApp();
  const on = isFiltered(queryOf(params, mine));
  return (
    <button type="button" className={`tk-filter-btn${on ? ' is-on' : ''}`} aria-label="Filter and sort"
      onClick={() => openSheet('tasks.filter', { mine: !!mine })}>
      <SlidersHorizontal size={18} aria-hidden="true" />
    </button>
  );
}

/** ①b Filter & sort: status, project and priority filters, then the sort order, edited as a draft. Reset puts the draft
 *  back to the list's default; Apply re-opens the list underneath with the draft as its params, which closes the overlay.
 *  The title row is a drag zone, so the overlay swipes down from there too. */
export function TasksFilter({ params }) {
  const mine = !!params?.mine;
  const { current, params: screen, go } = useApp();
  const [draft, setDraft] = useState(() => queryOf(screen, mine));
  const [resets, setResets] = useState(0);   // remounts the chip rows, which keep their own picked index
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const reset = () => { setDraft(baseQuery(mine)); setResets(n => n + 1); };
  return (
    <div className="tk-fsheet">
      <h2 className="t-title2" data-sheet-drag="">Filter &amp; sort</h2>
      <div className="field tk-wrap">
        <Label>Status</Label>
        <Chips key={`status-${resets}`} items={STATUSES} on={draft.status} onPick={i => set({ status: i })} />
      </div>
      <div className="field">
        <Label>Project</Label>
        <Select block label="Project" options={PROJECTS()} value={draft.project} onChange={v => set({ project: v })} />
      </div>
      <div className="field tk-wrap">
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
      <div className="tk-two tk-fsheet-foot">
        <Btn block onClick={reset}>Reset</Btn>
        <Btn kind="primary" block onClick={() => go(current, { params: { ...screen, ...draft } })}>Apply</Btn>
      </div>
    </div>
  );
}
