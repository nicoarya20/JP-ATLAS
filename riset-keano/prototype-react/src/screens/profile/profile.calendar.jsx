// Profile ② My calendar: a simple iOS-style week view of the signed-in person's events. Month title, a Sunday-first
// week strip (swipe to change week, tap a day), then that day's hours with event blocks and a red now line on today.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Screen } from '../../kit';
import { EV } from '../events/events.shared';
import {
  NOW_MIN, TODAY, WEEKDAYS, addDays, clock, dayLabel, eventsFor, hourLabel, itemsOn, monthLabel, sameDay, weekOf,
} from './profile.calendar.dates';
import { useWeekSwipe } from './profile.calendar.swipe';

const HOUR_PX = 56;           // height of one hour row
const FIRST_MIN = 8 * 60;     // a day without events opens scrolled to 8 AM
const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Block colour per event type (pf-cal-ev modifier). */
const TONE = { Meeting: 'blue', Review: 'purple', Important: 'red', 'Team event': 'green' };

/** One week of day buttons. Only the shown week is interactive; its neighbours are scenery for the drag. */
function WeekPage({ start, day, pick, marked, shown }) {
  return (
    <div className="pf-cal-days" aria-hidden={shown ? undefined : 'true'}>
      {weekOf(start).map(d => {
        const on = sameDay(d, day);
        const today = sameDay(d, TODAY);
        const cls = ['pf-cal-day', on && 'is-on', today && 'is-today', (d.getDay() % 6 === 0) && 'is-weekend'].filter(Boolean).join(' ');
        return (
          <button key={d.getDate()} type="button" className={cls} aria-pressed={on} onClick={() => pick(d)}
            tabIndex={shown ? undefined : -1} aria-label={`${dayLabel(d)}${today ? ', today' : ''}`}>
            <span className="pf-cal-wd" aria-hidden="true">{WEEKDAYS[d.getDay()][0]}</span>
            <span className="pf-cal-num">{d.getDate()}</span>
            <i className={`pf-cal-mark${marked(d) ? ' is-on' : ''}`} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sunday-first week strip: last, this and next week side by side, so a drag shows the neighbour sliding in. The
 * neighbours select the same weekday, which is where the selection lands after paging.
 */
function WeekStrip({ day, pick, marked }) {
  const track = useRef(null);
  const weekKey = weekOf(day)[0].getTime();
  const swipe = useWeekSwipe(track, weekKey, step => pick(addDays(day, 7 * step)));
  return (
    <div className="pf-cal-week" aria-label="Week" role="group" {...swipe}>
      <div className="pf-cal-track" ref={track}>
        {[-7, 0, 7].map(n => (
          <WeekPage key={n} start={addDays(day, n)} day={addDays(day, n)} pick={pick} marked={marked} shown={n === 0} />
        ))}
      </div>
    </div>
  );
}

/** One event on the hour grid, placed by its start minute and length; opens the event's own screen. */
function EventBlock({ it }) {
  const { e } = it;
  const open = useNav(EV.open(e));
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
  const [day, pick] = useState(TODAY);
  const todays = itemsOn(items, day);
  return (
    <Screen title="My calendar" back className="pf-cal">
      <div className="pf-cal-head">
        <h2 className="pf-cal-month t-title3">{monthLabel(day)}</h2>
        <WeekStrip day={day} pick={pick} marked={d => itemsOn(items, d).length > 0} />
        <p className="pf-cal-date t-subhead bold">
          {dayLabel(day)}<span className="muted"> · {todays.length ? `${todays.length} event${todays.length > 1 ? 's' : ''}` : 'No events'}</span>
        </p>
      </div>
      <DayGrid day={day} items={todays} />
    </Screen>
  );
}
