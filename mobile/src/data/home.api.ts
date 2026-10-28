/**
 * `GET /api/app/home`, and the clock that rides along with it (K1).
 *
 * This is the worked example of the pattern in `mobile/docs/phase2-pola-data.md`: one `resource`,
 * one `load` that does the request and nothing else, and the screens left reading a store.
 *
 * It is also where the app's clock comes from. There is no endpoint of its own for "today" — home
 * is called when the app opens anyway, so the session gate asks this resource for the clock and
 * the Home screen later asks the same resource for its data. Rule 1 means that is one request,
 * not two.
 *
 * The types below mirror `server/home/home.dto.ts`. Only `now` is validated: every date in the app
 * is derived from it, so a malformed one is raised here instead of showing wrong days everywhere.
 * The sections are read through `widget()`, which treats a section that is absent exactly like a
 * section the server reported as failed — the screen then offers "Try again" on that card alone.
 */
import { apiGet } from '@/api/client';
import { ApiError, CLIENT_CODES } from '@/api/errors';
import { type SessionClock, sessionStore, setSessionClock } from '@/session/session.state';

import { resource } from './resource';

/** A section that loaded, or one that failed on its own (`server/home/home.dto.ts`). */
export type Widget<T> = { ok: true; data: T } | { ok: false };

/** Part of the day the server put the request in; the app words it in English itself. */
export type GreetingWire = 'pagi' | 'siang' | 'sore' | 'malam';

/** `now` of the home payload: the clock the whole app's dates are built on, plus its labels. */
export type HomeNowWire = {
  today: string;
  timeZone: string;
  /** Instant of the request. Not read yet; the app shows instants, not "x minutes ago". */
  iso: string;
  greeting: GreetingWire;
  /** `Kamis, 8 Oktober 2026` and `07.30`, both Indonesian; only the time one is used (briefing). */
  dateLabel: string;
  timeLabel: string;
};

export type HomeBriefingWire = { lines: string[]; updatedLabel: string };

export type HomeProjectRefWire = { id: string; name: string };

/** Where a task sits against today, as the server grouped it. */
export type HomeScheduleGroupWire = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export type HomeFocusTaskWire = {
  id: string;
  number: number;
  title: string;
  project: HomeProjectRefWire;
  dueDate: string | null;
  group: HomeScheduleGroupWire;
  /** Whole days past the due date, only for the overdue group. */
  overdueDays: number | null;
  priority: string;
  /** The row's one button, decided by the server's policy: finish it, start it, or neither. */
  action: 'complete' | 'start' | null;
};

export type HomeReviewTaskWire = {
  id: string;
  number: number;
  title: string;
  project: HomeProjectRefWire;
};

export type HomeFocusWire = {
  items: HomeFocusTaskWire[];
  /** Every open task of mine, not just the page of rows above. */
  total: number;
  overdueTotal: number;
  todayTotal: number;
  awaitingReview: HomeReviewTaskWire[];
  awaitingReviewTotal: number;
};

export type HomeDoneTaskWire = {
  id: string;
  number: number;
  title: string;
  project: HomeProjectRefWire;
  /** "Anda" for my own, else the person's name — Indonesian, from the server. */
  byName: string;
  /** "hari ini", "kemarin" or the weekday — Indonesian, from the server. */
  dayLabel: string;
};

export type HomeDoneWire = { items: HomeDoneTaskWire[]; total: number };

export type HomeProjectWire = {
  id: string;
  name: string;
  dueDate: string | null;
  /** `percent` is null for a project with no tasks yet, which is not the same as 0%. */
  progress: { done: number; total: number; percent: number | null };
  condition: 'on_track' | 'at_risk' | 'off_track' | null;
  /** Why it needs a look, in Indonesian; null when it is on track. */
  reason: string | null;
};

export type HomeAgendaItemWire = {
  id: string;
  title: string;
  kind: string;
  startsAt: string;
  endsAt: string;
  locationType: string | null;
  project: HomeProjectRefWire | null;
  day: 'today' | 'tomorrow';
};

export type HomeActivityItemWire = {
  id: string;
  /** The whole sentence, in Indonesian, from the server. */
  text: string;
  projectName: string;
  at: string;
  taskNumber: number;
};

export type AskBarWire = { label: string; pct: number; display: string };
export type AskAnswerWire = {
  key: 'behind' | 'stalled' | 'busiest';
  question: string;
  answer: string;
  bars: AskBarWire[];
};

/** What `GET /api/app/home` answers (`server/home/home.dto.ts` `HomeData`). */
export type HomeResponse = {
  now: HomeNowWire;
  briefing: Widget<HomeBriefingWire>;
  counters: Widget<unknown>;
  focus: Widget<HomeFocusWire>;
  done: Widget<HomeDoneWire>;
  projects: Widget<HomeProjectWire[]>;
  agenda: Widget<HomeAgendaItemWire[]>;
  activity: Widget<HomeActivityItemWire[]>;
  ask: Widget<AskAnswerWire[]>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const badPayload = (why: string): ApiError =>
  new ApiError({
    message: `The server's home data could not be used: ${why}`,
    code: CLIENT_CODES.BAD_RESPONSE,
    status: 0,
  });

/**
 * One section, or "not there". A section the server could not build answers `{ ok: false }`; one
 * that is missing from the payload altogether is read the same way, so an older or partial payload
 * shows a card that offers to try again instead of crashing the screen.
 */
export function widget<T>(section: Widget<T> | undefined): Widget<T> {
  if (!section || typeof section !== 'object' || section.ok !== true) return { ok: false };
  return { ok: true, data: section.data };
}

/** The same section with its data in the screen's shape; a failed one stays failed. */
export const mapWidget = <A, B>(section: Widget<A>, to: (data: A) => B): Widget<B> =>
  section.ok ? { ok: true, data: to(section.data) } : { ok: false };

/**
 * The clock out of the payload, checked before it is trusted. A missing or malformed `now` is
 * raised rather than defaulted: every date in the app is derived from it, so a wrong one would
 * show wrong days everywhere instead of failing once, here.
 */
export function readClock(payload: unknown): SessionClock {
  const now = (payload as { now?: unknown } | null)?.now as Partial<HomeNowWire> | undefined;
  if (!now || typeof now !== 'object') throw badPayload('it carried no `now`.');
  const { today, timeZone } = now;
  if (typeof today !== 'string' || !ISO_DATE.test(today))
    throw badPayload(`\`now.today\` is not a YYYY-MM-DD date (${String(today)}).`);
  if (typeof timeZone !== 'string' || timeZone.trim() === '')
    throw badPayload('`now.timeZone` is missing.');
  return { today, timeZone };
}

async function loadHome(): Promise<HomeResponse> {
  const payload = await apiGet<HomeResponse>('/api/app/home');
  setSessionClock(readClock(payload));
  return payload;
}

/** Home's data, and the clock with it. */
export const homeResource = resource<HomeResponse>('home', loadHome);

/**
 * Make sure the server's clock is in the session, fetching home once if it is not. The session
 * gate calls this before it lets a dated screen render.
 *
 * Home being `ready` is not enough: the clock lives in the session, and a session that ended and
 * started again has none while home may still hold the last answer. So without a clock this asks
 * again (joining a request already out), whatever home's own state says.
 */
export const ensureClock = () =>
  sessionStore.get().clock ? homeResource.ensure() : homeResource.reload();
