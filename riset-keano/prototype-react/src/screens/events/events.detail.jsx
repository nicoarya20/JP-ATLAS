// Events ④ detail (one-off, default "Onboarding design review") and ④b detail (recurring, default "Atlas sprint
// review") for the event in the screen params. Edit/Cancel/Archive: Admin all events, PM own events or managed
// projects, Member only own events. A canceled event keeps only Move to Archive.
import { Camera, ChevronRight, Mic, PenLine, Repeat } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Menu, Pill, Screen, StatusPill } from '../../kit';
import { Ai, Box, Bullets, EvHead, EvSec, Note } from './events.parts';
import { EV, REPEATS, eventOf } from './events.shared';
import { useEvents } from './events.store';

/** ⋯ menu: Cancel event (⑩) and Move to Archive (⑪); a recurring event opens ⑩b / ⑪b; a canceled one can only be archived. */
function menuItems(e) {
  const suffix = e.repeat ? '-recurring' : '';
  const archive = { label: 'Move to Archive', sheet: `events.archive${suffix}`, params: { event: e.id }, danger: true };
  return e.canceled ? [archive] : [{ label: 'Cancel event', sheet: `events.cancel${suffix}`, params: { event: e.id } }, archive];
}
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
  const openProject = useNav({ go: 'projects.overview', params: { project: e.project || 'atlas' } });
  const rows = [
    ['Time', `${EV.date(e)} · ${e.range}`],
    ['Location', EV.where(e)],
    ['Project', <button type="button" className="ev-kv-link row-flex" onClick={openProject}>{EV.project(e)}<ChevronRight size={16} aria-hidden="true" /></button>],
    ['Repeat', REPEATS.find(([, v]) => v === (e.repeat || ''))?.[0] || e.repeat],
    ['Reminder', '1 day & 30 min before'],
  ];
  return (
    <dl className="ev-kv">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

/** Ways to write the minutes: Type and Photo anytime, Voice from the start time. */
function Minutes({ e }) {
  const start = EV.start(e);
  const p = { event: e.id };
  return (
    <div className="ev-box stack sm">
      <p className="t-subhead">Type and Photo work anytime. Voice is active from the start time ({start}) until the meeting ends.</p>
      <Btn block icon={<PenLine size={16} />} go="events.step2" params={p}>Type</Btn>
      <Btn block icon={<Camera size={16} />} toast="Take a photo of the whiteboard or notes">Photo</Btn>
      <Btn block icon={<Mic size={16} />} go="events.record-ready" params={p}>Voice · from {start}</Btn>
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

/** "Canceled by Nico: reason"; canceling one occurrence of a recurring event leaves the next ones. */
function Canceled({ c }) {
  return (
    <Box>
      <p className="bold">Canceled by {c.by}</p>
      <p className="muted">{c.reason}</p>
      {c.once && <p className="t-footnote muted">Only this occurrence; the next ones continue.</p>}
    </Box>
  );
}

/** Body of ④ (fallback "review", created by Rina) and ④b (fallback "sprint", created by Nico). */
function Detail({ rec }) {
  const { is, params } = useApp();
  useEvents();
  const e = eventOf(params, rec ? 'sprint' : 'review');
  const editor = !is('member') || D.me().name === e.creator;
  const role = n => [n === e.creator && 'Creator', n === e.noteTaker && 'Note-taker'].filter(Boolean).join(' · ');
  const people = [e.creator, ...e.attendees.filter(n => n !== e.creator)];
  const status = EV.status(e);
  const by = [`Created by ${e.creator}`, e.updated && `Updated ${e.updated}`, e.editor && `by ${e.editor}`].filter(Boolean).join(' · ');
  return (
    <Screen back title="Event detail" right={editor ? <Menu items={menuItems(e)} label="Event actions" /> : undefined}>
      <EvHead title={e.title}>
        <StatusPill status={status} />
        <Pill tone="outline">{e.type}</Pill>
        {e.repeat && <Pill><span className="row-flex ev-gap-1"><Repeat size={12} aria-hidden="true" />Repeats</span></Pill>}
      </EvHead>
      {e.canceled && <Canceled c={e.canceled} />}
      {editor && !e.canceled && <Btn kind="primary" block go="events.new" params={{ event: e.id }}>Edit</Btn>}
      <Facts e={e} />
      <EvSec title={`Attendees (${people.length})`}>{people.map(n => <Person key={n} name={n} role={role(n)} />)}</EvSec>
      <EvSec title="Agenda">{e.agenda?.length ? <Bullets items={e.agenda} /> : <Note>No agenda yet</Note>}</EvSec>
      {!e.canceled && <EvSec title="Minutes" tag={<Pill>None yet</Pill>}><Minutes e={e} /></EvSec>}
      <Access e={e} />
      <Note>{by}</Note>
    </Screen>
  );
}

/** Events ④: one-off upcoming event. */
export const DetailUpcoming = () => <Detail />;
/** Events ④b: recurring event. */
export const DetailRecurring = () => <Detail rec />;
