// Events sheets: ⑩/⑪ cancel and archive a one-off event, ⑩b/⑪b a recurring one; the event comes from the ⋯ menu's params
// (else the design review / the sprint review). Cancel keeps the event visible, marked Canceled with the reason sent to
// the attendees; Archive moves it to Archive until restored and lands on Archive ③ (Undo).
import { useState } from 'react';
import { Checkbox } from '@react-cupertino-ui/checkbox';
import { Radio } from '@react-cupertino-ui/radio';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Field, Link, Sheet } from '../../kit';
import { Box, Note, Two } from './events.parts';
import { EV, eventOf } from './events.shared';
import { archiveEvent, cancelEvent } from './events.store';

const ONLY_THIS = 0;

/** Back/Cancel (closes) + primary action, disabled until ok. */
function Pair({ back, primary, ok = true, onClick }) {
  return (
    <Two>
      <Btn block close>{back}</Btn>
      <Btn kind="primary" block disabled={!ok} onClick={onClick}>{primary}</Btn>
    </Two>
  );
}

/** "Which one?" single choice for a recurring event. opts: [[label, hint]]; on = picked index. */
function Which({ name, opts, on, pick }) {
  return (
    <fieldset className="field ev-which">
      <legend className="t-footnote muted">Which one?</legend>
      {opts.map(([label, hint], i) => (
        <div key={label} className="ev-plain">
          <Radio name={name} label={label} helperText={hint} checked={i === on} onChange={() => pick(i)} />
        </div>
      ))}
    </fieldset>
  );
}

/** Cancel with a required reason; once = only this occurrence. replace = go on to New event for a replacement. */
function useCancel(e) {
  const { toast, closeSheet, go } = useApp();
  return (reason, once, replace) => {
    cancelEvent(e.id, reason.trim(), D.me().name, { once });
    toast('Event canceled');
    closeSheet();
    if (replace) go('events.new');
  };
}

/** Archive (once = only this occurrence), then the list with Undo in place of the detail. */
function useArchive(e) {
  const { closeSheet, go } = useApp();
  return once => {
    archiveEvent(e.id, D.me().name, { once });
    closeSheet();
    go('archive.undo', { top: true, params: { event: e.id } });
  };
}

/** Events ⑩: cancel a one-off event. */
export function CancelSheet({ params }) {
  const e = eventOf(params, 'review');
  const [reason, setReason] = useState('');
  const [replace, setReplace] = useState(false);
  const cancel = useCancel(e);
  return (
    <Sheet title="Cancel event?" sub={`${e.title} · ${EV.date(e)}, ${EV.start(e)}`}
      actions={<Pair back="Back" primary="Cancel event" ok={!!reason.trim()} onClick={() => cancel(reason, false, replace)} />}>
      <p className="t-subhead">The event stays visible, marked Canceled. All attendees ({e.attendees.join(', ')}) are notified.</p>
      <Field area label="Reason *" value={reason} placeholder="Why isn't it happening?" onChange={setReason} />
      <Note>The reason shows in the event detail and in the attendees' notifications.</Note>
      <Checkbox variant="solid" label="Also create a replacement event" checked={replace} onChange={ev => setReplace(ev.target.checked)} />
    </Sheet>
  );
}

/** Events ⑪: move a one-off event to Archive. */
export function ArchiveSheet({ params }) {
  const e = eventOf(params, 'review');
  const archive = useArchive(e);
  return (
    <Sheet title="Archive event?" sub={e.title} actions={<Pair back="Cancel" primary="Move to Archive" onClick={() => archive(false)} />}>
      <p className="t-subhead">The event moves to Archive and can be restored anytime. Minutes and meeting outcomes move with it. Tasks already created from the outcomes are not deleted.</p>
      {!e.canceled && <Box>Meeting not happening? Use <Link className="bold" sheet="events.cancel" params={{ event: e.id }}>Cancel</Link> so attendees know why.</Box>}
    </Sheet>
  );
}

/** Events ⑩b: cancel one occurrence (default) or the whole series. */
export function CancelRecurringSheet({ params }) {
  const s = eventOf(params, 'sprint');
  const [which, setWhich] = useState(ONLY_THIS);
  const [reason, setReason] = useState('');
  const cancel = useCancel(s);
  return (
    <Sheet title="Cancel recurring event?" sub={`${s.title} · ${s.repeat} · ${EV.date(s)} · ${EV.start(s)}`}
      actions={<Pair back="Back" primary="Cancel event" ok={!!reason.trim()} onClick={() => cancel(reason, which === ONLY_THIS)} />}>
      <Which name="ev-cancel-which" on={which} pick={setWhich}
        opts={[['Only this one', 'Other occurrences continue'], ['All recurring', 'This occurrence and the following ones']]} />
      <Field area label="Reason *" value={reason} placeholder="Why isn't it happening?" onChange={setReason} />
    </Sheet>
  );
}

/** Events ⑪b: archive one occurrence or the whole series (default). */
export function ArchiveRecurringSheet({ params }) {
  const s = eventOf(params, 'sprint');
  const [which, setWhich] = useState(1);
  const archive = useArchive(s);
  return (
    <Sheet title="Archive recurring event?" sub={s.title}
      actions={<Pair back="Cancel" primary="Move to Archive" onClick={() => archive(which === ONLY_THIS)} />}>
      <Which name="ev-archive-which" on={which} pick={setWhich}
        opts={[['Only this one', 'Moves to Archive, other occurrences stay'], ['All recurring', 'Whole series moves to Archive as one item']]} />
    </Sheet>
  );
}
