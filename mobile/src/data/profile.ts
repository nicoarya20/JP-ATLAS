// Profile for the screens: my own account as the server has it (`GET /api/app/profile`, the
// account role from `whoami`, the Inbox count from `/api/app/inbox/count`), and my calendar's week
// and day. The requests live in profile.api.ts; this file only maps.
import { today } from './clock';
import { toServerEvent } from './events.map';
import type { EventHref } from './events.shared';
import { eventHref, eventWhere } from './events.shared';
import { inboxActionCount } from './inbox.api';
import { profileResource } from './profile.api';
import { peekEventsRange } from './profile.calendar.api';
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
import { viewer as signedIn } from './viewer';
import { whoamiRoleLabel } from './whoami.api';

/** Me, as the profile screens show me. Identity is `userId`; the names are for display (K4). */
export type ProfileMe = {
  userId: string;
  /** Full name: the display name I chose, else the account's own. */
  full: string;
  /** What a greeting calls me: my nickname, else the first word of my full name. */
  name: string;
  email: string;
  /** Job title; empty when I have not set one. */
  title: string;
  /** Department; empty when I have not set one. */
  division: string;
  /** Phone; empty when I have not set one. */
  phone: string;
};

export type ProfileData = {
  me: ProfileMe;
  /** "Project Manager · Product · Admin" — the job, the department, then the account role. */
  line: string;
  /** Items in Inbox › Needs your response, as the server counts them. */
  inbox: number;
};

/**
 * `greetingName` of `server/profile/profile.greeting.ts`, ported (GAP A-2): the rule is not sent as
 * a field, so the only way to agree with the server's own greeting is to apply the same rule here.
 * The server's fallback is the Indonesian "pengguna"; this app's own copy is English, and an empty
 * name is better left empty than filled with a word nobody chose.
 */
export function greetingName(p: {
  nickname: string | null;
  displayName: string | null;
  name: string;
}): string {
  const nick = p.nickname?.trim();
  if (nick) return nick;
  return (p.displayName?.trim() || p.name.trim()).split(/\s+/)[0] ?? '';
}

/**
 * Me before `GET /api/app/profile` lands: the account from the session, which is real data — the
 * name and the email the server signed me in with. Only the job title and the department are
 * missing, and they come back blank rather than as a guess.
 */
function fromSession(): ProfileMe {
  const who = signedIn();
  return {
    userId: who.userId,
    full: who.full,
    name: who.name,
    email: '',
    title: '',
    division: '',
    phone: '',
  };
}

/**
 * Profile ① from the stores. Never null: the session already knows who is signed in, so the modal
 * opens on a real name and fills in the rest when the profile answers.
 *
 * The two parameters are ignored and kept only so the More panel and its tiles (another area's
 * files) keep compiling while they still pass them: what is shown is the caller's own account as
 * the server reports it, not a function of the role a screen was rendered as.
 */
export function getProfile(_role?: Role, _decided?: unknown): ProfileData {
  const wire = profileResource.current();
  const me: ProfileMe = wire
    ? {
        userId: wire.userId,
        full: wire.displayName?.trim() || wire.name,
        name: greetingName(wire),
        email: wire.email,
        title: wire.jobTitle ?? '',
        division: wire.department ?? '',
        phone: wire.phone ?? '',
      }
    : fromSession();
  const role = whoamiRoleLabel();
  return {
    me,
    line: [me.title, me.division, role].filter(Boolean).join(' · '),
    // 0 while the count is still out, which draws no badge at all — better than a number this
    // app made up. The count comes from `/api/app/inbox/count`, so it is the whole lane and not
    // the length of the page the Inbox screen happens to hold.
    inbox: inboxActionCount() ?? 0,
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
  /** The week held more events than one read carries, so a day may be missing some. */
  truncated: boolean;
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

/** The range My calendar reads for `day`: the Sunday-first week holding it. */
export function calendarRange(day: string): { from: string; to: string } {
  const week = weekOf(day);
  return { from: week[0] ?? day, to: week[week.length - 1] ?? day };
}

/**
 * Profile ② My calendar on `day`, from the store. The week is one range read, so the strip's dots
 * and the day's blocks come from the same answer and cannot disagree.
 */
export function getMyCalendar(day: string): MyCalendarData {
  const { from, to } = calendarRange(day);
  const week = peekEventsRange(from, to);
  const items = eventsFor(week.items.map((item) => toServerEvent(item)));
  const todays = itemsOn(items, day);
  const n = todays.length;
  return {
    month: monthLabel(day),
    week: weekDays(items, day),
    dayLabel: dayLabel(day),
    count: n ? `${n} event${n > 1 ? 's' : ''}` : 'No events',
    today: day === today(),
    blocks: todays.map(block),
    scrollY: initialScroll(todays),
    truncated: week.truncated,
  };
}
