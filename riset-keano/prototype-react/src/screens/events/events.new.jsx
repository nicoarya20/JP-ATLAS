// Events ③a / ③b New event: short form, then "more details". Shown filled in with the sample "Onboarding design review".
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { D } from '../../data/sample';
import { Btn, Chips, Field, Link, Screen, Select, Seg } from '../../kit';
import { EvField, EvFoot, Note, Box, Two } from './events.parts';
import { EV, TYPES } from './events.shared';

const sample = () => D.event('review');

/** Attendee pill with its remove mark. */
function Person({ name }) {
  return <span className="ev-person">{name}<X size={14} aria-label={`Remove ${name}`} /></span>;
}

/** Fields both forms share: title, date, time, location, attendees. */
function Basics() {
  const e = sample();
  return (
    <>
      <Field label="Title *" value={e.title} />
      <Field label="Date *" value={`${EV.date(e)}, 2026`} icon={<ChevronDown size={16} aria-hidden="true" />} />
      <Two><Field label="Start" value={EV.start(e)} /><Field label="End" value={EV.end(e)} /></Two>
      <EvField label="Location" hint="Online: paste the meeting link (Google Meet / Zoom).">
        <Seg items={['In person', 'Online']} on={e.mode === 'Online' ? 1 : 0} />
        <Field value={e.place} />
      </EvField>
      <EvField label="Attendees · picked from team members">
        <div className="ev-pills">
          {e.attendees.map(n => <Person key={n} name={n} />)}
          <Btn sm kind="ghost" icon={<Plus size={14} />} toast="Add a team member">Add person</Btn>
        </div>
      </EvField>
    </>
  );
}

function NewFoot() {
  return (
    <EvFoot>
      <Two>
        <Btn block back>Cancel</Btn>
        <Btn kind="primary" block go="events.detail-upcoming" toast="Event saved">Save</Btn>
      </Two>
    </EvFoot>
  );
}

/** Events ③a: the short new-event form. */
export function NewEvent() {
  return (
    <Screen back title="New event" className="ev-has-foot">
      <Basics />
      <Box>Set automatically: reminder 1 day & 30 minutes before · does not repeat</Box>
      <Link className="ev-more" go="events.new-details"><Plus size={16} aria-hidden="true" /> Add more details</Link>
      <NewFoot />
    </Screen>
  );
}

/** Events ③b: the new-event form with type, project, agenda, repeat and reminder. */
export function NewEventDetails() {
  const e = sample();
  return (
    <Screen back title="New event" className="ev-has-foot">
      <Basics />
      <Link className="ev-more" back><ChevronUp size={16} aria-hidden="true" /> Hide details</Link>
      <EvField label="Event type"><Chips items={TYPES} on={TYPES.indexOf(e.type)} /></EvField>
      <EvField label="Project (optional)" hint="Required if meeting outcomes will become tasks.">
        <Select block toast="Pick a project">{D.project('atlas').name}</Select>
      </EvField>
      <Field area label="Agenda" value={e.agenda.map((a, i) => `${i + 1}. ${a}`).join('\n')} />
      <Two>
        <EvField label="Repeat"><Select block toast="No · Daily · Weekly · Every 2 weeks · Monthly">No</Select></EvField>
        <EvField label="Reminder"><Select block toast="Pick reminder times">1 day & 30 min before</Select></EvField>
      </Two>
      <Note>Minutes are written during or after the meeting, from the event detail. Attendees get reminders automatically.</Note>
      <NewFoot />
    </Screen>
  );
}
