// Events ② month calendar: Month/Week switch, month title + Today, October 2026 grid with event dots, then today's agenda.
// Dots and agenda show the events left by the screen params' Filter & sort query (events.query), same as the list.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Section, Seg } from '../../kit';
import { EventsScreen, EventsTools } from './events.list';
import { TODAY_DATE, applyQuery, eventsPerDate, queryOf } from './events.query';
import { EV } from './events.shared';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Minutes since midnight of an event's start, to order the agenda ("2:00 PM" → 840). */
const startMinutes = e => {
  const [, h, m, pm] = EV.start(e).match(/^(\d+):(\d+) (AM|PM)$/) || [];
  return (Number(h) % 12) * 60 + Number(m) + (pm === 'PM' ? 720 : 0);
};

/** dots = events on this date (2+ shows two dots). Oct 1 = Atlas kickoff: tapping it opens its results while it is shown. */
function Day({ n, on, pick, dots }) {
  const kickoff = D.event('kickoff');
  const open = useNav(n === 1 && dots ? { go: EV.results(kickoff) } : undefined);
  const dot = dots > 1 ? 'two' : dots ? '' : 'none';
  return (
    <button type="button" className={`ev-date${on ? ' on' : ''}`} aria-pressed={on}
      aria-label={n === 1 ? `Oct 1 · ${kickoff.title}` : undefined} onClick={e => { pick(n); open?.(e); }}>
      <span className="ev-num">{n}</span>
      <i className={`ev-dot ${dot}`.trim()} />
    </button>
  );
}

function Month({ events }) {
  const [picked, setPicked] = useState(TODAY_DATE);
  const dots = eventsPerDate(events);
  return (
    <div className="ev-grid">
      {WEEKDAYS.map(d => <span key={d} className="ev-wd">{d}</span>)}
      <div className="ev-lead" />
      {DAYS.map(n => <Day key={n} n={n} on={n === picked} pick={setPicked} dots={dots[n] || 0} />)}
    </div>
  );
}

/** Today's event in the agenda under the grid. */
function Agenda({ e }) {
  return (
    <Section go={e.status === 'Done' ? EV.results(e) : 'events.detail-upcoming'} className="ev-card">
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

function Arrow({ label, toast, children }) {
  return <button type="button" className="ev-arrow" aria-label={label} onClick={useNav({ toast })}>{children}</button>;
}

/** Events ② calendar (month view). */
export default function EventsCalendar() {
  const { params } = useApp();
  const events = applyQuery(D.events, queryOf(params));
  const todays = events.filter(e => e.day === 'Today').sort((a, b) => startMinutes(a) - startMinutes(b));
  return (
    <EventsScreen>
      <EventsTools on={1} />
      <Seg items={['Month', 'Week']} on={0} />
      <div className="between">
        <span className="ev-month">
          <Arrow label="Previous month" toast="Previous month"><ChevronLeft size={20} /></Arrow>
          <span className="t-headline">October 2026</span>
          <Arrow label="Next month" toast="Next month"><ChevronRight size={20} /></Arrow>
        </span>
        <Btn sm toast="Jumped to today">Today</Btn>
      </div>
      <Month events={events} />
      <div className="ev-sep" />
      <h2 className="t-footnote muted bold">{D.today.short} · {todays.length} {todays.length === 1 ? 'event' : 'events'}</h2>
      {todays.map(e => <Agenda key={e.id} e={e} />)}
    </EventsScreen>
  );
}
