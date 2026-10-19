// Profile ② My calendar: a simple iOS-style week view of the signed-in person's events. Month title with arrows to
// switch month, a Sunday-first week strip (swipe to change week, tap a day), then that day's hours with event blocks
// and a red now line on today. Today in the nav bar jumps back.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Link, Screen } from '../../kit';
import { EV } from '../events/events.shared';
import {
  NOW_MIN, TODAY, WEEKDAYS, addDays, clock, dayLabel, eventsFor, hourLabel, itemsOn, monthLabel, sameDay, shiftMonth, weekOf,
} from './profile.calendar.dates';

const HOUR_PX = 56;           // height of one hour row
const SWIPE_PX = 40;          // horizontal travel on the week strip that changes the week
const FIRST_MIN = 8 * 60;     // a day without events opens scrolled to 8 AM
const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Block colour per event type (pf-cal-ev modifier). */
const TONE = { Meeting: 'blue', Review: 'purple', Important: 'red', 'Team event': 'green' };

/** Sunday-first week strip. Swiping left/right moves the selected day a week; a swipe never also taps a day. */
function WeekStrip({ day, pick, dir, marked }) {
  const swipe = useRef(null);
  const swallowClick = useRef(false);
  const onPointerDown = e => { swipe.current = e.clientX; swallowClick.current = false; };
  const onPointerUp = e => {
    if (swipe.current == null) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    swallowClick.current = true;
    pick(addDays(day, dx < 0 ? 7 : -7), dx < 0 ? 'next' : 'prev');
  };
  const onClickCapture = e => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const week = weekOf(day);
  return (
    <div className="pf-cal-week" aria-label="Week" role="group" onPointerDown={onPointerDown} onPointerUp={onPointerUp}
      onPointerCancel={() => { swipe.current = null; }} onClickCapture={onClickCapture}>
      <div key={week[0].getTime()} className={`pf-cal-days ${dir}`.trim()}>
        {week.map(d => {
          const on = sameDay(d, day);
          const today = sameDay(d, TODAY);
          const cls = ['pf-cal-day', on && 'is-on', today && 'is-today', (d.getDay() % 6 === 0) && 'is-weekend'].filter(Boolean).join(' ');
          return (
            <button key={d.getDate()} type="button" className={cls} aria-pressed={on} onClick={() => pick(d)}
              aria-label={`${dayLabel(d)}${today ? ', today' : ''}`}>
              <span className="pf-cal-wd" aria-hidden="true">{WEEKDAYS[d.getDay()][0]}</span>
              <span className="pf-cal-num">{d.getDate()}</span>
              <i className={`pf-cal-mark${marked(d) ? ' is-on' : ''}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One event on the hour grid, placed by its start minute and length; opens the event's own screen. */
function EventBlock({ it }) {
  const { e } = it;
  const open = useNav({ go: e.status === 'Done' ? EV.results(e) : EV.detail(e) });
  return (
    <button type="button" className={`pf-cal-ev ${TONE[e.type] || 'gray'}${it.end - it.start < 45 ? ' is-short' : ''}`}
      style={{ '--at': it.start, '--len': it.end - it.start }} onClick={open}>
      <span className="pf-cal-ev-title">{e.title}</span>
      <span className="pf-cal-ev-meta">{e.range} · {EV.where(e)}</span>
    </button>
  );
}

/** The day's 24 hour rows with its events; opens scrolled to an hour before now (today), the first event, or 8 AM. */
function DayGrid({ day, items }) {
  const scroller = useRef(null);
  const today = sameDay(day, TODAY);
  const focus = today ? NOW_MIN : items[0]?.start ?? FIRST_MIN;
  useLayoutEffect(() => {
    scroller.current.scrollTop = (Math.max(focus - 60, 0) / 60) * HOUR_PX;
  }, [day, focus]);
  return (
    <div className="pf-cal-scroll" ref={scroller}>
      <div className="pf-cal-grid" style={{ '--hour': `${HOUR_PX}px` }}>
        {HOURS.map(h => <div key={h} className="pf-cal-hour"><span className="pf-cal-hl">{hourLabel(h)}</span></div>)}
        {items.map(it => <EventBlock key={it.e.id} it={it} />)}
        {today && <div className="pf-cal-now" style={{ '--at': NOW_MIN }}><span className="pf-cal-now-t">{clock(NOW_MIN)}</span></div>}
      </div>
    </div>
  );
}

export default function ProfileCalendar() {
  const me = D.me();
  const items = useMemo(() => eventsFor(me.name), [me.name]);
  const [view, setView] = useState({ day: TODAY, dir: '' });   // dir = 'next' | 'prev': which way the week strip slides in
  const pick = (d, dir) => setView(v => ({ day: d, dir: dir ?? (d > v.day ? 'next' : d < v.day ? 'prev' : v.dir) }));
  const { day, dir } = view;
  const todays = itemsOn(items, day);
  const month = n => pick(shiftMonth(day, n), n > 0 ? 'next' : 'prev');
  return (
    <Screen title="My calendar" back className="pf-cal" right={<Link onClick={() => pick(TODAY)}>Today</Link>}>
      <div className="pf-cal-head">
        <div className="between pf-cal-month">
          <h2 className="t-title3">{monthLabel(day)}</h2>
          <span className="row-flex">
            <button type="button" className="pf-cal-arrow" aria-label="Previous month" onClick={() => month(-1)}><ChevronLeft size={22} /></button>
            <button type="button" className="pf-cal-arrow" aria-label="Next month" onClick={() => month(1)}><ChevronRight size={22} /></button>
          </span>
        </div>
        <WeekStrip day={day} pick={pick} dir={dir} marked={d => itemsOn(items, d).length > 0} />
        <p className="pf-cal-date t-subhead bold">
          {dayLabel(day)}<span className="muted"> · {todays.length ? `${todays.length} event${todays.length > 1 ? 's' : ''}` : 'No events'}</span>
        </p>
      </div>
      <DayGrid day={day} items={todays} />
    </Screen>
  );
}
