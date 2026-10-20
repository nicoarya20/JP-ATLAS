// Events ④ detail (one-off "Onboarding design review") and ④b detail (recurring "Atlas sprint review").
// Edit/Cancel/Archive: Admin all events, PM own events or managed projects, Member only own events.
// No sample event belongs to the Member, so a Member never gets the ⋯ menu or Edit.
import { Camera, ChevronRight, Mic, PenLine, Repeat } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Menu, Pill, Screen } from '../../kit';
import { Ai, Box, Bullets, EvHead, EvSec, Note } from './events.parts';
import { EV, PROJECT } from './events.shared';

/** Last edit of each sample event (not in D). */
const UPDATED = { review: 'Oct 7', sprint: 'Sep 25' };
/** Sprint review has no agenda in D. */
const SPRINT_AGENDA = ["Demo of this sprint's work", 'What went well and what to fix', 'Plan for the next sprint'];

/** ⋯ menu: Cancel event (⑩) and Move to Archive (⑪); suffix '-recurring' opens ⑩b / ⑪b. */
const menuItems = suffix => [
  { label: 'Cancel event', sheet: `events.cancel${suffix}` },
  { label: 'Move to Archive', sheet: `events.archive${suffix}`, danger: true },
];

function Person({ name, role }) {
  return (
    <div className="ev-who">
      <Avatar name={name} size="sm" />
      <span className="grow t-subhead">{name}</span>
      {role && <span className="t-footnote muted">{role}</span>}
    </div>
  );
}

/** Time, location, project, repeat, reminder. */
function Facts({ e }) {
  const openProject = useNav({ go: 'projects.overview' });
  const rows = [
    ['Time', `${EV.date(e)} · ${e.range}`],
    ['Location', EV.where(e)],
    ['Project', <button type="button" className="ev-kv-link row-flex" onClick={openProject}>{PROJECT()}<ChevronRight size={16} aria-hidden="true" /></button>],
    ['Repeat', e.repeat ? e.repeat[0].toUpperCase() + e.repeat.slice(1) : 'No'],
    ['Reminder', '1 day & 30 min before'],
  ];
  return (
    <dl className="ev-kv">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

/** Ways to write the minutes: Type and Photo anytime, Voice from the start time. */
function Minutes({ start }) {
  return (
    <div className="ev-box stack sm">
      <p className="t-subhead">Type and Photo work anytime. Voice is active from the start time ({start}) until the meeting ends.</p>
      <Btn block icon={<PenLine size={16} />} go="events.step2">Type</Btn>
      <Btn block icon={<Camera size={16} />} toast="Take a photo of the whiteboard or notes">Photo</Btn>
      <Btn block icon={<Mic size={16} />} go="events.record-ready">Voice · from {start}</Btn>
      <p className="t-footnote muted row-flex"><Ai /> = AI-assisted. The result is a text draft you can edit first.</p>
    </div>
  );
}

/** Why the viewer may (or may not) change it; a PM who isn't the creator edits as the project's manager. */
function Access({ e }) {
  const { is } = useApp();
  if (D.me().name === e.creator) return <Note>You created this event</Note>;
  if (is('admin')) return <Note>You can change this event as an Admin</Note>;
  if (is('member')) return <Box>Only the creator ({e.creator}), the project manager or an Admin can change this event.</Box>;
  return null;
}

/** Body of ④ (rec = false: D "review", created by Rina) and ④b (rec = true: D "sprint", created by Nico). */
function Detail({ rec }) {
  const { is } = useApp();
  const e = D.event(rec ? 'sprint' : 'review');
  const editor = !is('member');
  const role = n => [n === e.creator && 'Creator', n === e.noteTaker && 'Note-taker'].filter(Boolean).join(' · ');
  const people = [e.creator, ...e.attendees.filter(n => n !== e.creator)];
  return (
    <Screen back title="Event detail" right={editor ? <Menu items={menuItems(rec ? '-recurring' : '')} label="Event actions" /> : undefined}>
      <EvHead title={e.title}>
        <Pill tone="accent">Upcoming</Pill>
        <Pill tone="outline">{e.type}</Pill>
        {rec ? <Pill><span className="row-flex ev-gap-1"><Repeat size={12} aria-hidden="true" />Repeats</span></Pill> : <Pill>Today</Pill>}
      </EvHead>
      {editor && <Btn kind="primary" block go="events.new">Edit</Btn>}
      <Facts e={e} />
      <EvSec title={`Attendees (${people.length})`}>{people.map(n => <Person key={n} name={n} role={role(n)} />)}</EvSec>
      <EvSec title="Agenda"><Bullets items={e.agenda || SPRINT_AGENDA} /></EvSec>
      <EvSec title="Minutes" tag={<Pill>None yet</Pill>}><Minutes start={EV.start(e)} /></EvSec>
      <Access e={e} />
      <Note>Created by {e.creator} · Updated {UPDATED[e.id]}</Note>
    </Screen>
  );
}

/** Events ④: one-off upcoming event. */
export const DetailUpcoming = () => <Detail />;
/** Events ④b: recurring event. */
export const DetailRecurring = () => <Detail rec />;
