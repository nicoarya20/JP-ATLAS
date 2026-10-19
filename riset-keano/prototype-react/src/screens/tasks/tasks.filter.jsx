// Tasks ①b: one Filter & sort overlay (full-height, like the profile) opened from the icon next to the search field;
// it replaces the status chips and the Filter / Sort pills.
import { Radio } from '@react-cupertino-ui/radio';
import { SlidersHorizontal } from 'lucide-react';
import { Btn, Chips, Label, Select } from '../../kit';
import { useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { PRIORITIES, SORTS, STATUSES } from './tasks.shared';


/** Round filter icon on the right of the search field. project = project id the list is scoped to (shows a dot: a filter is on). */
export function FilterButton({ project }) {
  const open = useNav({ sheet: 'tasks.filter', params: project ? { project } : {} });
  return (
    <button type="button" className={`tk-filter-btn${project ? ' is-on' : ''}`} aria-label="Filter and sort" onClick={open}>
      <SlidersHorizontal size={18} aria-hidden="true" />
    </button>
  );
}

/** ①b Filter & sort: status, project and priority filters, then the sort order; Reset or Apply pinned at the bottom
 *  (the prototype only toasts). The title row is a drag zone, so the overlay swipes down from there too. */
export function TasksFilter({ params }) {
  const project = D.project(params?.project);
  return (
    <div className="tk-fsheet">
      <h2 className="t-title2" data-sheet-drag="">Filter &amp; sort</h2>
      <div className="field tk-wrap">
        <Label>Status</Label>
        <Chips items={STATUSES} on={0} />
      </div>
      <div className="field">
        <Label>Project</Label>
        <Select block toast="Pick a project">{project ? project.name : 'All projects'}</Select>
      </div>
      <div className="field tk-wrap">
        <Label>Priority</Label>
        <Chips items={PRIORITIES} on={0} />
      </div>
      <div className="field">
        <Label>Sort by</Label>
        <div className="stack sm" role="radiogroup" aria-label="Sort by">
          {SORTS.map((s, i) => <Radio key={s} variant="solid" name="tk-sort" size="sm" defaultChecked={i === 0} label={s} />)}
        </div>
      </div>
      <div className="tk-two tk-fsheet-foot">
        <Btn block toast="Filters reset">Reset</Btn>
        <Btn kind="primary" block close toast="Filter applied">Apply</Btn>
      </div>
    </div>
  );
}
