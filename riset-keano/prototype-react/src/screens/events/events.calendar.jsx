// Events ② month calendar: October 2026 grid with event dots, then today's agenda.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Section, Seg } from '../../kit';
import { EventsScreen, EventsTools } from './events.list';
import { EV } from './events.shared';

// Dots mark days with events in D (2 = more than one): Oct 1 = Atlas kickoff (tap → results), Oct 23 = next sprint review.
const DOTS = { 1: 1, 7: 2, 8: 1, 9: 1, 13: 1, 15: 1, 23: 1 };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const TODAY = 7;

function Day({ n, on, pick }) {
  const kickoff = D.event('kickoff');
  const open = useNav(n === 1 ? { go: EV.results(kickoff) } : undefined);
  const dot = DOTS[n] === 2 ? 'two' : DOTS[n] ? '' : 'none';
  return (
    <button type="button" className={`ev-date${on ? ' on' : ''}`} aria-pressed={on}
      aria-label={n === 1 ? `Oct 1 · ${kickoff.title}` : undefined} onClick={e => { pick(n); open?.(e); }}>
      <span className="ev-num">{n}</span>
      <i className={`ev-dot ${dot}`.trim()} />
    </button>
  );
}

function Month() {
  const [picked, setPicked] = useState(TODAY);
  return (
    <div className="ev-grid">
      {WEEKDAYS.map(d => <span key={d} className="ev-wd">{d}</span>)}
      <div className="ev-lead" />
      {DAYS.map(n => <Day key={n} n={n} on={n === picked} pick={setPicked} />)}
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
  const todays = ['daily', 'review'].map(D.event);
  return (
    <EventsScreen>
      <EventsTools on={1} />
      <div className="between">
        <span className="ev-month">
          <Arrow label="Previous month" toast="Previous month"><ChevronLeft size={20} /></Arrow>
          <span className="t-headline">October 2026</span>
          <Arrow label="Next month" toast="Next month"><ChevronRight size={20} /></Arrow>
        </span>
        <span className="ev-acts">
          <Btn sm toast="Jumped to today">Today</Btn>
          <Seg items={['Month', 'Week']} on={0} />
        </span>
      </div>
      <Month />
      <div className="ev-sep" />
      <h2 className="t-footnote muted bold">{D.today.short} · {todays.length} events</h2>
      {todays.map(e => <Agenda key={e.id} e={e} />)}
    </EventsScreen>
  );
}
