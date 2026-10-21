// Tasks ⑪–⑫: Return (from the review screen) and Cancel (from the detail ⋯) sheets.
import { useState } from 'react';
import { Radio } from '@react-cupertino-ui/radio';
import { Btn, Chips, Field, Label, Sheet } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { useStatusAction } from './tasks.detail';
import { info, pick } from './tasks.shared';
import { cancelTask } from './tasks.store';

const sub = no => `#${no} ${D.task(no).title}`;
// kind: 'primary' (lime) for the sheet's main action, 'danger' when that action cancels the task.
const pair = (cancel, primary, ok, onClick, kind = 'primary') => (
  <div className="tk-two">
    <Btn close>{cancel}</Btn>
    <Btn kind={kind} block disabled={!ok} onClick={onClick}>{primary}</Btn>
  </div>
);

const QUICK = ['Still has errors', 'Not as requested', 'Evidence unclear'];

/** ⑪ Return — reason required (a quick pick fills it); the task goes back to In progress and the count is logged. */
export function TasksReturn({ params }) {
  const no = pick(params, 'tasks.detail-review', 17);
  const [reason, setReason] = useState('');
  const act = useStatusAction(no);
  const n = (info(no).returned || 0) + 1, why = reason.trim();
  const send = () => act('In progress', 'Task returned', `returned this task ×${n}: ${why}`, { returned: n });
  return (
    <Sheet title="Return task" sub={sub(no)} actions={pair('Cancel', 'Return', why, send)}>
      <div className="field">
        <span className="t-footnote muted">Quick pick (fills the reason)</span>
        <Chips items={QUICK} on={-1} onPick={i => setReason(QUICK[i])} />
      </div>
      <Field label="Reason *" area placeholder="Explain what needs fixing…" value={reason} onChange={setReason} />
      <p className="t-footnote muted">The task goes back to In progress and is logged as "Returned ×{n}". {D.task(no).who} gets a notification.</p>
    </Sheet>
  );
}

const REASONS = ['Duplicate / already exists', 'No longer needed', 'Outside the project scope', 'Created by mistake', 'Other'];
const OTHER = REASONS.length - 1;

/** ⑫ Cancel — reason required (note required for Other); the task moves to Archive and the detail closes. Task comes from the ⋯ button. */
export function TasksCancel({ params }) {
  const { toast, closeSheet, back } = useApp();
  const no = D.task(params.task) ? params.task : 17;
  const [why, setWhy] = useState(-1);
  const [text, setText] = useState('');
  const extra = text.trim();
  const ok = why >= 0 && (why !== OTHER || extra);
  const send = () => {
    cancelTask(no, why === OTHER ? extra : `${REASONS[why]}${extra ? ` (${extra})` : ''}`, D.me().name);
    toast('Task moved to Archive');
    closeSheet();
    back({ skipSheet: true });
  };
  return (
    <Sheet title="Cancel task" sub={sub(no)} actions={pair('Back', 'Cancel task', ok, send, 'danger')}>
      <div className="field">
        <Label>Why cancel? *</Label>
        <div className="stack sm" role="radiogroup" aria-label="Why cancel?">
          {REASONS.map((r, i) => <Radio key={r} variant="solid" name="tk-cancel-reason" size="sm" label={r}
            checked={why === i} onChange={() => setWhy(i)} />)}
        </div>
      </div>
      <Field label="Note * (required for Other)" area placeholder="Add a note…" value={text} onChange={setText} />
      <p className="t-footnote muted">The task moves to Archive. Anyone can restore it from there.</p>
    </Sheet>
  );
}
