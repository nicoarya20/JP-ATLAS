// Tasks ①b: one Filter & sort sheet opened from the icon next to the search field (replaces the status chips and the Filter / Sort pills).
import { Radio } from '@react-cupertino-ui/radio';
import { SlidersHorizontal } from 'lucide-react';
import { Btn, Chips, Label, Select, Sheet } from '../../kit';
import { useNav } from '../../core/app.context';
import { D } from '../../data/sample';

export const STATUSES = ['All active', 'To do', 'In progress', 'In review', 'Done'];
const PRIORITIES = ['All', 'High', 'Medium', 'Low'];
export const SORTS = ['Due date', 'Priority', 'Recently updated', 'Title (A–Z)'];

/** Round filter icon on the right of the search field. project = project id the list is scoped to (shows a dot: a filter is on). */
export function FilterButton({ project }) {
  const open = useNav({ sheet: 'tasks.filter', params: project ? { project } : {} });
  return (
    <button type="button" className={`tk-filter-btn${project ? ' is-on' : ''}`} aria-label="Filter and sort" onClick={open}>
      <SlidersHorizontal size={18} aria-hidden="true" />
    </button>
  );
}

/** ①b Filter & sort: status, project and priority filters, then the sort order; Reset or Apply (the prototype only toasts). */
export function TasksFilter({ params }) {
  const project = D.project(params?.project);
  return (
    <Sheet title="Filter & sort" actions={(
      <div className="tk-two">
        <Btn block toast="Filters reset">Reset</Btn>
        <Btn kind="primary" block close toast="Filter applied">Apply</Btn>
      </div>
    )}>
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
    </Sheet>
  );
}
