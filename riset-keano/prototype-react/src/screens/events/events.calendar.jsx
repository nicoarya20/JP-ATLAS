// Events ② calendar: Month/Week switch, its title with arrows, the month grid (or the picked date's week) with event
// dots, then the picked date's agenda. Dots and agenda show past and upcoming events of the screen params' type and
// project filters (events.query); a Member sees only events they attend; a recurring event keeps repeating into later months.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Section, Seg } from '../../kit';
import { useEvents } from './events.store';
import { EventsScreen, EventsTools } from './events.list';
import { TODAY, applyQuery, eventsOn, firstDate, queryOf } from './events.query';
import { EV } from './events.shared';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK = 1;   // index of Week in the Month / Week switch
const LOCALE = 'en-US';

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
/** Column of a date, Mon = 0. */
const col = d => (d.getDay() + 6) % 7;
/** "Thu, Oct 8" — same format as D.today.short. */
const dateLabel = d => d.toLocaleDateString(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' });
const dayMonth = d => d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
/** Every date of d's month. */
const monthOf = d => Array.from({ length: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() },
  (_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1));
/** The Mon–Sun week holding d (it may run into the next or previous month). */
const weekOf = d => Array.from({ length: 7 }, (_, i) => addDays(d, i - col(d)));

/** Minutes since midnight of an event's start, to order the agenda ("2:00 PM" → 840). */
const startMinutes = e => {
  const [, h, m, pm] = EV.start(e).match(/^(\d+):(\d+) (AM|PM)$/) || [];
  return (Number(h) % 12) * 60 + Number(m) + (pm === 'PM' ? 720 : 0);
};

/** dots = events on this date (2+ shows two dots). Tap picks the date. */
function Day({ d, on, pick, dots }) {
  const dot = dots > 1 ? 'two' : dots ? '' : 'none';
  return (
    <button type="button" className={`ev-date${on ? ' on' : ''}`} aria-pressed={on} aria-label={dateLabel(d)} onClick={() => pick(d)}>
      <span className="ev-num">{d.getDate()}</span>
      <i className={`ev-dot ${dot}`.trim()} />
    </button>
  );
}

/** Weekday heads, then the given dates; empty cells keep a month's first date under its weekday. */
function Grid({ days, picked, pick, events }) {
  const lead = col(days[0]);
  return (
    <div className="ev-grid">
      {WEEKDAYS.map(d => <span key={d} className="ev-wd">{d}</span>)}
      {lead > 0 && <div style={{ gridColumn: `span ${lead}` }} />}
      {days.map(d => <Day key={d.toDateString()} d={d} on={sameDay(d, picked)} pick={pick} dots={eventsOn(events, d).length} />)}
    </div>
  );
}

function Arrow({ label, onClick, children }) {
  return <button type="button" className="ev-arrow" aria-label={label} onClick={onClick}>{children}</button>;
}

/** Month: "October 2026". Week: "Oct 5 – 11" or "Oct 26 – Nov 1". The arrows step by a month or a week. */
function Title({ week, days, step }) {
  const unit = week ? 'week' : 'month';
  const first = days[0], last = days.at(-1);
  const title = !week ? first.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
    : `${dayMonth(first)} – ${sameMonth(first, last) ? last.getDate() : dayMonth(last)}`;
  return (
    <span className="ev-month">
      <Arrow label={`Previous ${unit}`} onClick={() => step(-1)}><ChevronLeft size={20} /></Arrow>
      <span className="t-headline">{title}</span>
      <Arrow label={`Next ${unit}`} onClick={() => step(1)}><ChevronRight size={20} /></Arrow>
    </span>
  );
}

/** An event in the agenda of date d; tap: not done → detail, done → its outcomes (same as the list card).
 *  When only one occurrence of a series was canceled, its later dates are still Upcoming. */
function Agenda({ e, d }) {
  const status = e.canceled?.once && !sameDay(d, firstDate(e)) ? 'Upcoming' : EV.status(e);
  return (
    <Section {...EV.open(e)} className="ev-card">
      <div className="ev-card-grid">
        <span className="ev-when">{e.time}</span>
        <div className="stack xs">
          <p className="t-headline">{e.title}</p>
          <p className="t-footnote muted">{e.type} · {status}</p>
        </div>
      </div>
    </Section>
  );
}

/** Events ② calendar. Opens on Month with today picked. A month arrow picks the 1st of that month (today in today's
 *  month); a week arrow moves the picked date 7 days. Week shows the picked date's week. */
export default function EventsCalendar() {
  const { is, params } = useApp();
  useEvents();
  const [view, setView] = useState(0);
  const [picked, setPicked] = useState(TODAY);
  const me = D.me().name;
  const mine = D.events.filter(e => !is('member') || e.attendees.includes(me));
  const events = applyQuery(mine, { ...queryOf(params), when: null });
  const week = view === WEEK;
  const days = week ? weekOf(picked) : monthOf(picked);
  const agenda = eventsOn(events, picked).sort((a, b) => startMinutes(a) - startMinutes(b));
  const step = by => setPicked(d => {
    if (week) return addDays(d, 7 * by);
    const first = new Date(d.getFullYear(), d.getMonth() + by, 1);
    return sameMonth(first, TODAY) ? TODAY : first;
  });
  return (
    <EventsScreen>
      <EventsTools on={1} />
      <Seg items={['Month', 'Week']} on={view} onPick={setView} />
      <Title week={week} days={days} step={step} />
      <Grid days={days} picked={picked} pick={setPicked} events={events} />
      <div className="ev-sep" />
      <h2 className="t-footnote muted bold">{dateLabel(picked)} · {agenda.length} {agenda.length === 1 ? 'event' : 'events'}</h2>
      {agenda.length ? agenda.map(e => <Agenda key={e.id} e={e} d={picked} />) : <p className="t-footnote muted">No events on this day.</p>}
    </EventsScreen>
  );
}
