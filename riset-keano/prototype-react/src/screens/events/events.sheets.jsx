// Events sheets: ①b filter, ⑩/⑪ cancel and delete the one-off design review, ⑩b/⑪b the recurring sprint review.
// Cancel keeps the event visible (reason sent to attendees); Archive moves it to Archive until restored and lands on Archive ③ (Undo).
import { Checkbox } from '@react-cupertino-ui/checkbox';
import { Radio } from '@react-cupertino-ui/radio';
import { D } from '../../data/sample';
import { Btn, Chips, Field, Link, Select, Seg, Sheet } from '../../kit';
import { Box, EvField, Note, Two } from './events.parts';
import { EV, TYPES } from './events.shared';

const one = () => D.event('review');
const series = () => D.event('sprint');

/** Required reason, sent to the attendees. */
function Reason({ text }) {
  return <Field area label="Reason *" value={text} />;
}

/** Back/Cancel (closes) + primary action (closes, then toast or go). */
function Pair({ back, primary, ...nav }) {
  return (
    <Two>
      <Btn block close>{back}</Btn>
      <Btn kind="primary" block close {...nav}>{primary}</Btn>
    </Two>
  );
}

/** "Which one?" single choice for a recurring event. opts: [[label, hint]]; on = preselected index. */
function Which({ name, opts, on }) {
  return (
    <fieldset className="field ev-which">
      <legend className="t-footnote muted">Which one?</legend>
      {opts.map(([label, hint], i) => (
        <div key={label} className="ev-plain">
          <Radio name={name} label={label} helperText={hint} defaultChecked={i === on} />
        </div>
      ))}
    </fieldset>
  );
}

/** Events ①b: filter by project and type, group by schedule or type. */
export function FilterSheet() {
  return (
    <Sheet title="Filter events" actions={(
      <Two>
        <Btn block toast="Filters reset">Reset</Btn>
        <Btn kind="primary" block close toast="Filter applied">Apply</Btn>
      </Two>
    )}>
      <EvField label="Project"><Select block toast="Pick a project">All projects</Select></EvField>
      <EvField label="Event type"><div className="ev-wrap"><Chips items={['All', ...TYPES]} on={0} /></div></EvField>
      <EvField label="Group by"><Seg items={['Schedule', 'Type']} on={0} /></EvField>
      <Note>Upcoming / Past tabs and search stay in the toolbar.</Note>
    </Sheet>
  );
}

/** Events ⑩: cancel the one-off event. */
export function CancelSheet() {
  const e = one();
  return (
    <Sheet title="Cancel event?" sub={`${e.title} · ${EV.date(e)}, ${EV.start(e)}`}
      actions={<Pair back="Back" primary="Cancel event" toast="Event canceled" />}>
      <p className="t-subhead">The event stays visible, marked Canceled. All attendees ({e.attendees.join(', ')}) are notified.</p>
      <Reason text="Rina wants to wait for the trial users' feedback, moving to next week." />
      <Note>The reason shows in the event detail and in the attendees' notifications.</Note>
      <Checkbox variant="solid" label="Also create a replacement event" />
    </Sheet>
  );
}

/** Events ⑪: move the one-off event to Archive. */
export function ArchiveSheet() {
  return (
    <Sheet title="Archive event?" sub={one().title} actions={<Pair back="Cancel" primary="Move to Archive" go="archive.undo" />}>
      <p className="t-subhead">The event moves to Archive and can be restored anytime. Minutes and meeting outcomes move with it. Tasks already created from the outcomes are not deleted.</p>
      <Box>Meeting not happening? Use <Link className="bold" sheet="events.cancel">Cancel</Link> so attendees know why.</Box>
    </Sheet>
  );
}

/** Events ⑩b: cancel one occurrence (default) or the whole series. */
export function CancelRecurringSheet() {
  const s = series();
  return (
    <Sheet title="Cancel recurring event?" sub={`${s.title} · ${s.repeat} · ${EV.date(s)} · ${EV.start(s)}`}
      actions={<Pair back="Back" primary="Cancel event" toast="Event canceled" />}>
      <Which name="ev-cancel-which" on={0}
        opts={[['Only this one', 'Other occurrences continue'], ['All recurring', 'This occurrence and the following ones']]} />
      <Reason text="This week's meeting is postponed." />
    </Sheet>
  );
}

/** Events ⑪b: archive one occurrence or the whole series (default). */
export function ArchiveRecurringSheet() {
  return (
    <Sheet title="Archive recurring event?" sub={series().title}
      actions={<Pair back="Cancel" primary="Move to Archive" go="archive.undo" />}>
      <Which name="ev-archive-which" on={1}
        opts={[['Only this one', 'Moves to Archive, other occurrences stay'], ['All recurring', 'Whole series moves to Archive as one item']]} />
    </Sheet>
  );
}
