// Profile for the screens (prototype profile.main.jsx / profile.calendar.jsx): my hero line, the Inbox count, and my
// calendar's week and day. Phase 2 reads the API here.
import { today } from './clock';
import type { EventHref, EventItem } from './events.shared';
import { eventHref, eventWhere } from './events.shared';
import { respondCards } from './inbox';
import { me, type PersonInfo } from './people';
import {
  type CalendarItem,
  dayLabel,
  eventsFor,
  initialScroll,
  itemsOn,
  monthLabel,
  WEEKDAYS,
  weekday,
  weekOf,
} from './profile.calendar.dates';
import type { Role } from './sample';
import { type Decisions, getDecisions } from './users';
import { viewer as signedIn } from './viewer';

export type ProfileData = {
  me: PersonInfo;
  /** "Project Manager · Product", plus " · Admin" for an Admin. */
  line: string;
  /** Items in Inbox › Needs your response. */
  inbox: number;
};

/** Profile ① for `role`; `decided` (the Users decisions) sets the Admin's Inbox count. */
export function getProfile(role: Role, decided: Decisions = getDecisions()): ProfileData {
  const p = me(role);
  return {
    me: p,
    line: `${p.title} · ${p.division}${role === 'admin' ? ' · Admin' : ''}`,
    inbox: respondCards(role, decided).length,
  };
}

/** Event colour on the day grid, per type (Other and unknown types: neutral). */
export type CalendarTone = 'blue' | 'purple' | 'red' | 'green' | 'gray';

const TONE: Record<string, CalendarTone> = {
  Meeting: 'blue',
  Review: 'purple',
  Important: 'red',
  'Team event': 'green',
};

export type CalendarDay = {
  iso: string;
  num: number;
  /** First letter of the weekday ("W"). */
  letter: string;
  /** "Wednesday, Oct 7, 2026, today". */
  label: string;
  picked: boolean;
  today: boolean;
  weekend: boolean;
  /** Has at least one of my events. */
  marked: boolean;
};

export type CalendarBlock = {
  id: string;
  title: string;
  /** "2:00–3:00 PM · In person · Meeting Room 2". */
  meta: string;
  start: number;
  end: number;
  tone: CalendarTone;
  href: EventHref;
};

export type MyCalendarData = {
  month: string;
  week: CalendarDay[];
  /** "Wednesday, Oct 7, 2026". */
  dayLabel: string;
  /** "2 events", "1 event" or "No events". */
  count: string;
  today: boolean;
  blocks: CalendarBlock[];
  /** Where the hour grid opens. */
  scrollY: number;
};

const block = ({ e, start, end }: CalendarItem): CalendarBlock => ({
  id: e.id,
  title: e.title,
  meta: `${e.range} · ${eventWhere(e)}`,
  start,
  end,
  tone: TONE[e.type] ?? 'gray',
  href: eventHref(e),
});

/** Week strip holding `day`, Sunday first. */
export const weekDays = (items: readonly CalendarItem[], day: string): CalendarDay[] =>
  weekOf(day).map((iso) => ({
    iso,
    num: Number(iso.slice(8)),
    letter: WEEKDAYS[weekday(iso)].charAt(0),
    label: `${dayLabel(iso)}${iso === today() ? ', today' : ''}`,
    picked: iso === day,
    today: iso === today(),
    weekend: weekday(iso) % 6 === 0,
    marked: itemsOn(items, iso).length > 0,
  }));

/** Profile ② My calendar for `role` on `day`, from the events list. */
export function getMyCalendar(
  role: Role,
  day: string,
  events: readonly EventItem[],
): MyCalendarData {
  const items = eventsFor(events, signedIn(role));
  const todays = itemsOn(items, day);
  const n = todays.length;
  return {
    month: monthLabel(day),
    week: weekDays(items, day),
    dayLabel: dayLabel(day),
    count: n ? `${n} event${n > 1 ? 's' : ''}` : 'No events',
    today: day === today(),
    blocks: todays.map(block),
    scrollY: initialScroll(day === today(), todays),
  };
}
