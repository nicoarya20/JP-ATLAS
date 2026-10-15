// Tasks ⑪–⑫: Return (from the review screen) and Cancel (from the detail ⋯) sheets.
import { Radio } from '@react-cupertino-ui/radio';
import { Btn, Chips, Field, Label, Sheet } from '../../kit';
import { D } from '../../data/sample';
import { pick } from './tasks.shared';

const sub = no => `#${no} ${D.task(no).title}`;
const pair = (cancel, primary, toast) => (
  <div className="tk-two">
    <Btn close>{cancel}</Btn>
    <Btn kind="primary" block close toast={toast}>{primary}</Btn>
  </div>
);

/** ⑪ Return — reason required; the task goes back to In progress and the count is logged. */
export function TasksReturn({ params }) {
  const no = pick(params, 'tasks.detail-review', 17);
  return (
    <Sheet title="Return task" sub={sub(no)} actions={pair('Cancel', 'Return', 'Task returned')}>
      <div className="field">
        <span className="t-footnote muted">Quick pick (fills the reason)</span>
        <Chips items={['Still has errors', 'Not as requested', 'Evidence unclear']} on={-1} />
      </div>
      <Field label="Reason *" area placeholder="Explain what needs fixing…" />
      <p className="t-footnote muted">The task goes back to In progress and is logged as "Returned ×1". {D.task(no).who} gets a notification.</p>
    </Sheet>
  );
}

const REASONS = ['Duplicate / already exists', 'No longer needed', 'Outside the project scope', 'Created by mistake', 'Other'];

/** ⑫ Cancel — reason required (note required for Other); moves to Canceled, can be restored. Task comes from the ⋯ button. */
export function TasksCancel({ params }) {
  const no = D.task(params.task) ? params.task : 17;
  return (
    <Sheet title="Cancel task" sub={sub(no)} actions={pair('Back', 'Cancel task', 'Task canceled')}>
      <div className="field">
        <Label>Why cancel? *</Label>
        <div className="stack sm" role="radiogroup" aria-label="Why cancel?">
          {REASONS.map((r, i) => <Radio key={r} variant="solid" name="tk-cancel-reason" size="sm" defaultChecked={i === REASONS.length - 1} label={r} />)}
        </div>
      </div>
      <Field label="Note * (required for Other)" area placeholder="Add a note…" />
      <p className="t-footnote muted">The task moves to Canceled. It can be restored.</p>
    </Sheet>
  );
}
