// Events ① list, ⑨ empty (Member), and the toolbar/app bar shared with ② calendar. EventsList is reused by Archive ③ Undo.
// The list shows its screen params' Filter & sort query (events.query).
import { CalendarDays, List, Plus, Repeat, SearchX } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Empty, Pill, Section, Seg, StackedScreen, StatusPill } from '../../kit';
import { EventsSearch } from './events.filter';
import { applyQuery, groupEvents, queryOf, queryParams, withoutQuery } from './events.query';
import { EV } from './events.shared';
import { useEvents } from './events.store';

/** Screen frame of the Events tab, stacked like Tasks and Projects (kit StackedScreen): the search with the Filter & sort
 *  icon folds into the header as the sheet scrolls, and the tab bar's "+" creates the event. */
export function EventsScreen({ children }) {
  return <StackedScreen title="Events" find={<EventsSearch />} tab="events">{children}</StackedScreen>;
}

/** List / Calendar switch at the top of the sheet; on = 0 list, 1 calendar. Switching keeps the query. */
export function EventsTools({ on }) {
  const { go, params } = useApp();
  return (
    <Seg items={['List', 'Calendar']} icons={[<List size={18} aria-hidden="true" />, <CalendarDays size={18} aria-hidden="true" />]}
      on={on} onPick={i => go(i ? 'events.calendar' : 'events.list', { params: queryParams(params) })} />
  );
}

/** Event card. Tap: not done → detail (recurring → ④b), with no button of its own; done → its outcomes, with a results button. */
function EventCard({ e }) {
  const { is } = useApp();
  const done = e.status === 'Done';
  const open = EV.open(e);
  const status = EV.status(e);
  const btn = !done ? null
    : EV.confirmed(e) || is('member') ? <Btn sm {...open}>View results</Btn>
      : <Btn sm {...open}>Check results</Btn>;
  return (
    <Section {...open} className="ev-card">
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
            <span className="ev-pills"><Pill tone="outline">{e.type}</Pill><StatusPill status={status} /></span>
            {btn}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** D.events narrowed by the query (upcoming / past lives there, not in tabs) and grouped by schedule or type; a Member sees only events they attend.
 *  Nothing left: an empty state whose Reset filters re-opens the screen with its default query. */
function Groups() {
  const { is, current, params, go } = useApp();
  useEvents();
  const me = D.me().name;
  const mine = D.events.filter(e => !is('member') || e.attendees.includes(me));
  const q = queryOf(params);
  const groups = groupEvents(applyQuery(mine, q), q);
  if (!groups.length) {
    return <Empty icon={<SearchX size={28} />} title="No events match these filters."
      action={<Btn kind="primary" onClick={() => go(current, { params: withoutQuery(params) })}>Reset filters</Btn>} />;
  }
  return groups.map(([g, list]) => (
    <section key={g} className="stack sm">
      <h2 className="t-footnote muted bold ev-day">{g}</h2>
      {list.map(e => <EventCard key={e.id} e={e} />)}
    </section>
  ));
}

/** Events ① list. overlay renders inside the screen (Archive ③ puts its Undo <Snack> there). */
export function EventsList({ overlay }) {
  return (
    <EventsScreen>
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
      <EventsTools on={0} />
      <Empty icon={<CalendarDays size={28} />} title="No events yet" text="Meetings or events you attend will show up here."
        action={<Btn kind="primary" icon={<Plus size={16} />} go="events.new">New event</Btn>} />
    </EventsScreen>
  );
}
