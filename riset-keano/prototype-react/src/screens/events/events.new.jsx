// Events ③a / ③b New event: short form, "Add more details" opens type, project, agenda and repeat. With screen params
// {event} it is the Edit form of that event, filled in. Save adds (or updates) the event through events.store.
import { useState } from 'react';
import { ChevronUp, Plus, X } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Chips, Field, Link, Screen, Select, Seg } from '../../kit';
import { EvField, EvFoot, Note, Box, Two } from './events.parts';
import { TODAY, firstDate } from './events.query';
import { EV, REPEATS, TYPES } from './events.shared';
import { addEvent, dateLabel, dateOn, editEvent } from './events.store';

const MODES = ['In person', 'Online'];
const FIRST_HOUR = 7, LAST_HOUR = 21, STEP_MIN = 15;
const LAST_DAY = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();

/** "2:00 PM" → minutes since midnight. */
const minutes = t => {
  const [, h, m, pm] = t.match(/^(\d+):(\d+) (AM|PM)$/);
  return (Number(h) % 12) * 60 + Number(m) + (pm === 'PM' ? 720 : 0);
};
const clock = n => `${(Math.floor(n / 60) + 11) % 12 + 1}:${String(n % 60).padStart(2, '0')} ${n < 720 ? 'AM' : 'PM'}`;
const TIMES = Array.from({ length: (LAST_HOUR - FIRST_HOUR) * 60 / STEP_MIN + 1 }, (_, i) => clock(FIRST_HOUR * 60 + i * STEP_MIN));
const timeOptions = TIMES.map(t => ({ value: t, label: t }));
/** Today until the end of the month (every sample event is in today's month). */
const dateOptions = Array.from({ length: LAST_DAY - TODAY.getDate() + 1 }, (_, i) => TODAY.getDate() + i)
  .map(n => ({ value: String(n), label: dateLabel(dateOn(n)) }));
const projectOptions = () => D.projects.map(p => ({ value: p.id, label: p.name }));
const repeatOptions = REPEATS.map(([label, value]) => ({ value, label }));

/** Form fields of event e (Edit), or a blank event tomorrow with me attending (New). */
function fieldsOf(e, me) {
  if (!e) {
    return { title: '', date: TODAY.getDate() + 1, start: '10:00 AM', end: '11:00 AM', mode: MODES[0], place: '',
      attendees: [me], type: TYPES[0], project: 'atlas', agenda: '', repeat: '' };
  }
  return { title: e.title, date: firstDate(e).getDate(), start: EV.start(e), end: EV.end(e), mode: e.mode, place: e.place === 'Online' ? '' : e.place,
    attendees: e.attendees, type: e.type, project: e.project || 'atlas', agenda: (e.agenda || []).join('\n'), repeat: e.repeat || '' };
}

/** Attendee pill; tap removes the person (the creator stays). */
function Person({ name, onRemove }) {
  if (!onRemove) return <span className="ev-person">{name}</span>;
  return <button type="button" className="ev-person" aria-label={`Remove ${name}`} onClick={onRemove}>{name}<X size={14} aria-hidden="true" /></button>;
}

/** Fields both forms share: title, date, time, location, attendees. set(patch) updates the form. */
function Basics({ f, set, creator }) {
  const left = Object.values(D.people).filter(p => !f.attendees.includes(p.name));
  return (
    <>
      <Field label="Title *" value={f.title} placeholder="What is the meeting about?" onChange={title => set({ title })} />
      <EvField label="Date *"><Select block label="Date" options={dateOptions} value={String(f.date)} onChange={v => set({ date: Number(v) })} /></EvField>
      <Two>
        <EvField label="Start"><Select block label="Start" options={timeOptions} value={f.start} onChange={start => set({ start })} /></EvField>
        <EvField label="End"><Select block label="End" options={timeOptions} value={f.end} onChange={end => set({ end })} /></EvField>
      </Two>
      <EvField label="Location" hint="Online: paste the meeting link (Google Meet / Zoom).">
        <Seg items={MODES} on={MODES.indexOf(f.mode)} onPick={i => set({ mode: MODES[i] })} />
        <Field label={f.mode === 'Online' ? 'Meeting link' : 'Place'} value={f.place} onChange={place => set({ place })} />
      </EvField>
      <EvField label="Attendees · picked from team members">
        <div className="ev-pills">
          {f.attendees.map(n => <Person key={n} name={n}
            onRemove={n === creator ? undefined : () => set({ attendees: f.attendees.filter(x => x !== n) })} />)}
          {left.length > 0 && <Select label="Add person" value="" onChange={n => set({ attendees: [...f.attendees, n] })}
            options={[{ value: '', label: 'Add person' }, ...left.map(p => ({ value: p.name, label: p.name }))]} />}
        </div>
      </EvField>
    </>
  );
}

/** Type, project, agenda (one item per line), repeat and reminder. */
function Details({ f, set }) {
  return (
    <>
      <EvField label="Event type"><Chips items={TYPES} on={TYPES.indexOf(f.type)} onPick={i => set({ type: TYPES[i] })} /></EvField>
      <EvField label="Project" hint="Meeting outcomes become tasks in this project.">
        <Select block label="Project" options={projectOptions()} value={f.project} onChange={project => set({ project })} />
      </EvField>
      <Field area label="Agenda · one item per line" value={f.agenda} onChange={agenda => set({ agenda })} />
      <Two>
        <EvField label="Repeat"><Select block label="Repeat" options={repeatOptions} value={f.repeat} onChange={repeat => set({ repeat })} /></EvField>
        <EvField label="Reminder"><Select block toast="Pick reminder times">1 day & 30 min before</Select></EvField>
      </Two>
      <Note>Minutes are written during or after the meeting, from the event detail. Attendees get reminders automatically.</Note>
    </>
  );
}

/** ③a / ③b (more = the details start open). New: Save opens the new event in place of the form. Edit: Save goes back to the detail. */
function EventForm({ more: open }) {
  const { params, go, back, toast } = useApp();
  const me = D.me().name;
  const e = D.event(params.event);
  const [f, setF] = useState(() => fieldsOf(e, me));
  const [more, setMore] = useState(open || !!e);
  const set = patch => setF(x => ({ ...x, ...patch }));
  const timeOk = minutes(f.end) > minutes(f.start);
  const ok = !!f.title.trim() && timeOk;
  const save = () => {
    const fields = { ...f, title: f.title.trim(), place: f.mode === 'Online' ? 'Online' : f.place.trim(),
      agenda: f.agenda.split('\n').map(a => a.replace(/^\d+\.\s*/, '').trim()).filter(Boolean) };
    if (e) {
      editEvent(e.id, fields, me);
      toast('Event updated');
      back();
      return;
    }
    const id = addEvent(fields, me);
    toast('Event saved');
    go(EV.detail(D.event(id)), { top: true, params: { event: id } });
  };
  return (
    <Screen back title={e ? 'Edit event' : 'New event'} className="ev-has-foot">
      <Basics f={f} set={set} creator={e ? e.creator : me} />
      {!timeOk && <Note>The end time must be after the start time.</Note>}
      {more ? (
        <>
          <Link className="ev-more" onClick={() => setMore(false)}><ChevronUp size={16} aria-hidden="true" /> Hide details</Link>
          <Details f={f} set={set} />
        </>
      ) : (
        <>
          <Box>Set automatically: reminder 1 day & 30 minutes before · {f.repeat ? `repeats ${f.repeat}` : 'does not repeat'}</Box>
          <Link className="ev-more" onClick={() => setMore(true)}><Plus size={16} aria-hidden="true" /> Add more details</Link>
        </>
      )}
      <EvFoot>
        <Two>
          <Btn block back>Cancel</Btn>
          <Btn kind="primary" block disabled={!ok} onClick={save}>Save</Btn>
        </Two>
      </EvFoot>
    </Screen>
  );
}

/** Events ③a: the short new-event form (or the Edit form of params.event). */
export const NewEvent = () => <EventForm />;
/** Events ③b: the new-event form with its details open. */
export const NewEventDetails = () => <EventForm more />;
