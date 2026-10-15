// Events ① list, ⑨ empty (Member), and the toolbar/app bar shared with ② calendar. EventsList is reused by Trash ③ Undo.
import { CalendarDays, Plus, Repeat, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Empty, Pill, Screen, Search, Section, Seg, Tabs } from '../../kit';
import { EV, STATUS_TONE } from './events.shared';

const NEW_EVENT = <Btn kind="primary" sm icon={<Plus size={16} />} go="events.new">New event</Btn>;

/** Screen frame of the Events tab: title, sub line, "+ New event" and the tab bar. */
export function EventsScreen({ children }) {
  return <Screen title="Events" sub="Meetings and team events" right={NEW_EVENT} tab="events">{children}</Screen>;
}

/** Search, Filter sheet and the List / Calendar switch; on = 0 list, 1 calendar. */
export function EventsTools({ on }) {
  return (
    <div className="ev-tools">
      <Search placeholder="Search title or location…" />
      <div className="ev-tools-row">
        <Btn sm icon={<SlidersHorizontal size={16} />} sheet="events.filter">Filter</Btn>
        <Seg items={['List', 'Calendar']} on={on} gos={['events.list', 'events.calendar']} />
      </div>
    </div>
  );
}

/** Upcoming / Past tabs (prototype shows Upcoming). */
const ListTabs = () => <Tabs items={['Upcoming', 'Past']} on={0} />;

/** Event card. Tap: not done → detail (recurring → ④b); done → its outcomes. */
function EventCard({ e }) {
  const { is } = useApp();
  const done = e.status === 'Done';
  const target = done ? EV.results(e) : EV.detail(e);
  const status = EV.status(e);
  const btn = !done ? <Btn sm go={target}>View</Btn>
    : EV.confirmed(e) || is('member') ? <Btn sm go={target}>View results</Btn>
      : <Btn kind="primary" sm go={target}>Check results</Btn>;
  return (
    <Section go={target} className="ev-card">
      <div className="ev-card-grid">
        <span className="ev-when">{/^(Today|Tomorrow)/.test(e.group) ? e.time : e.day}</span>
        <div className="stack sm">
          <div className="stack xs">
            <p className="t-headline">
              {e.title}
              {e.repeat && <span className="ev-repeat"><Repeat size={13} aria-hidden="true" /> {e.repeat}</span>}
            </p>
            <p className="t-footnote muted">{e.range} · {e.place}</p>
          </div>
          <div className="ev-card-foot">
            <span className="ev-pills"><Pill tone="outline">{e.type}</Pill><Pill tone={STATUS_TONE[status]}>{status}</Pill></span>
            {btn}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** D.events grouped by schedule; a Member sees only events they attend. */
function Groups() {
  const { is } = useApp();
  const me = D.me().name;
  const mine = D.events.filter(e => !is('member') || e.attendees.includes(me));
  return [...new Set(mine.map(e => e.group))].map(g => (
    <section key={g} className="stack sm">
      <h2 className="t-footnote muted bold ev-day">{g}</h2>
      {mine.filter(e => e.group === g).map(e => <EventCard key={e.id} e={e} />)}
    </section>
  ));
}

/** Events ① list. overlay renders inside the screen (Trash ③ puts its Undo <Snack> there). */
export function EventsList({ overlay }) {
  return (
    <EventsScreen>
      <ListTabs />
      <EventsTools on={0} />
      <Groups />
      {overlay}
    </EventsScreen>
  );
}

/** Events ⑨: a Member with no events yet. */
export function EventsEmpty() {
  return (
    <EventsScreen>
      <ListTabs />
      <EventsTools on={0} />
      <Empty icon={<CalendarDays size={28} />} title="No events yet" text="Meetings or events you attend will show up here."
        action={<Btn kind="primary" icon={<Plus size={16} />} go="events.new">New event</Btn>} />
    </EventsScreen>
  );
}
