// Events ② calendar: Month/Week switch, its title with arrows, the October 2026 grid (or the picked date's week) with
// event dots, then the picked date's agenda. Dots and agenda show the events left by the screen params' Filter & sort
// query (events.query), same as the list.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Section, Seg } from '../../kit';
import { EventsScreen, EventsTools } from './events.list';
import { TODAY_DATE, applyQuery, datesOf, eventsPerDate, queryOf } from './events.query';
import { EV } from './events.shared';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const LAST = DAYS.length;
const LEAD = 3;   // Oct 1, 2026 is a Thursday: three empty cells before it
const WEEK = 1;   // index of Week in the Month / Week switch

/** Column of an October date, Mon = 0. */
const col = n => (n - 1 + LEAD) % 7;
/** "Thu, Oct 8" — same format as D.today.short. */
const dateLabel = n => `${WEEKDAYS[col(n)]}, Oct ${n}`;
/** October dates of the Mon–Sun week holding n (the first and last weeks are cut at the month's edges). */
const weekOf = n => DAYS.filter(d => d >= n - col(n) && d < n - col(n) + 7);

/** Minutes since midnight of an event's start, to order the agenda ("2:00 PM" → 840). */
const startMinutes = e => {
  const [, h, m, pm] = EV.start(e).match(/^(\d+):(\d+) (AM|PM)$/) || [];
  return (Number(h) % 12) * 60 + Number(m) + (pm === 'PM' ? 720 : 0);
};

/** Events on an October date (a recurring one on each of its dates), in start-time order. */
const eventsOn = (events, n) => events.filter(e => datesOf(e).includes(n)).sort((a, b) => startMinutes(a) - startMinutes(b));

/** dots = events on this date (2+ shows two dots). Tap picks the date. */
function Day({ n, on, pick, dots }) {
  const dot = dots > 1 ? 'two' : dots ? '' : 'none';
  return (
    <button type="button" className={`ev-date${on ? ' on' : ''}`} aria-pressed={on} aria-label={dateLabel(n)} onClick={() => pick(n)}>
      <span className="ev-num">{n}</span>
      <i className={`ev-dot ${dot}`.trim()} />
    </button>
  );
}

/** Weekday heads, then the given dates; empty cells keep each date under its weekday. */
function Grid({ days, picked, pick, dots }) {
  const lead = col(days[0]);
  return (
    <div className="ev-grid">
      {WEEKDAYS.map(d => <span key={d} className="ev-wd">{d}</span>)}
      {lead > 0 && <div style={{ gridColumn: `span ${lead}` }} />}
      {days.map(n => <Day key={n} n={n} on={n === picked} pick={pick} dots={dots[n] || 0} />)}
    </div>
  );
}

/** onClick steps the view; without it the arrow only toasts (the prototype has October only). */
function Arrow({ label, toast, onClick, disabled, children }) {
  const nav = useNav({ toast });
  return <button type="button" className="ev-arrow" aria-label={label} disabled={disabled} onClick={onClick || nav}>{children}</button>;
}

/** Month: "October 2026". Week: "Oct 5 – 11", its arrows move the picked date a week within October. */
function Title({ week, days, step }) {
  if (!week) {
    return (
      <span className="ev-month">
        <Arrow label="Previous month" toast="Previous month"><ChevronLeft size={20} /></Arrow>
        <span className="t-headline">October 2026</span>
        <Arrow label="Next month" toast="Next month"><ChevronRight size={20} /></Arrow>
      </span>
    );
  }
  return (
    <span className="ev-month">
      <Arrow label="Previous week" disabled={days[0] === 1} onClick={() => step(-7)}><ChevronLeft size={20} /></Arrow>
      <span className="t-headline">Oct {days[0]} – {days.at(-1)}</span>
      <Arrow label="Next week" disabled={days.at(-1) === LAST} onClick={() => step(7)}><ChevronRight size={20} /></Arrow>
    </span>
  );
}

/** An event in the agenda under the grid; tap: not done → detail, done → its outcomes (same as the list card). */
function Agenda({ e }) {
  return (
    <Section go={e.status === 'Done' ? EV.results(e) : EV.detail(e)} className="ev-card">
      <div className="ev-card-grid">
        <span className="ev-when">{e.time}</span>
        <div className="stack xs">
          <p className="t-headline">{e.title}</p>
          <p className="t-footnote muted">{e.type} · {EV.status(e)}</p>
        </div>
      </div>
    </Section>
  );
}

/** Events ② calendar. Opens on Month with today picked; Week shows the picked date's week. */
export default function EventsCalendar() {
  const { params } = useApp();
  const [view, setView] = useState(0);
  const [picked, setPicked] = useState(TODAY_DATE);
  const events = applyQuery(D.events, queryOf(params));
  const week = view === WEEK;
  const days = week ? weekOf(picked) : DAYS;
  const agenda = eventsOn(events, picked);
  const step = by => setPicked(n => Math.min(LAST, Math.max(1, n + by)));
  return (
    <EventsScreen>
      <EventsTools on={1} />
      <Seg items={['Month', 'Week']} on={view} onPick={setView} />
      <Title week={week} days={days} step={step} />
      <Grid days={days} picked={picked} pick={setPicked} dots={eventsPerDate(events)} />
      <div className="ev-sep" />
      <h2 className="t-footnote muted bold">{dateLabel(picked)} · {agenda.length} {agenda.length === 1 ? 'event' : 'events'}</h2>
      {agenda.length ? agenda.map(e => <Agenda key={e.id} e={e} />) : <p className="t-footnote muted">No events on this day.</p>}
    </EventsScreen>
  );
}
