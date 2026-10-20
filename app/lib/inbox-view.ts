/**
 * Pure view logic of the Inbox: day sections, relative times and the lines under a card's sentence.
 * No React and no browser clock: `now` and the team zone come from the loader, and the day bucket of
 * each card was decided by the server, so server and browser print the same text (R03 D9).
 */
import { GROUP_HEADINGS, INBOX_COPY } from '~/components/inbox/inbox.copy';
import { formatEventTime } from './events-format';
import type { InboxGroup, InboxItem, InboxLane } from './inbox-api';
import { dueTasksLabel, formatLeaveRange, leaveDaysLabel } from './leave-view';

/** "Now" as the loader saw it, and the team zone every clock time is shown in. */
export type InboxClock = { now: number; timeZone: string };

const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const GROUP_ORDER: readonly InboxGroup[] = ['today', 'yesterday', 'older'];

/** A run of cards under one heading; the work queue is one section without a heading. */
export type InboxSection = { key: string; heading: string | null; items: InboxItem[] };

/** Cards under one heading per day (today, yesterday, older), in the order the server sent them. */
export function groupInbox(items: readonly InboxItem[]): InboxSection[] {
  return GROUP_ORDER.flatMap((group) => {
    const inGroup = items.filter((i) => i.group === group);
    return inGroup.length > 0
      ? [{ key: group, heading: GROUP_HEADINGS[group], items: inGroup }]
      : [];
  });
}

/** The work queue is one flat list, newest first; only the news lane is read by day. */
export function sectionsFor(lane: InboxLane, items: readonly InboxItem[]): InboxSection[] {
  if (lane === 'info') return groupInbox(items);
  return items.length > 0 ? [{ key: 'open', heading: null, items: [...items] }] : [];
}

/** How many cards still carry the unread dot. */
export const unreadCount = (items: readonly InboxItem[]) => items.filter((i) => !i.read).length;

const shortDate = new Map<string, Intl.DateTimeFormat>();
function shortDay(iso: string, timeZone: string): string {
  let f = shortDate.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone });
    shortDate.set(timeZone, f);
  }
  return f.format(new Date(iso));
}

/**
 * "10 menit lalu", "3 jam lalu" inside today, "Kemarin 16.40" for yesterday and "15 Okt 09.15" before
 * that. A card older than an hour never reads "x menit": the wording follows the server's day bucket.
 */
export function relativeTime(iso: string, group: InboxGroup, clock: InboxClock): string {
  const diff = clock.now - Date.parse(iso);
  if (group === 'today') {
    if (diff < MS_MINUTE) return INBOX_COPY.now;
    if (diff < MS_HOUR) return `${Math.floor(diff / MS_MINUTE)} menit lalu`;
    return `${Math.floor(diff / MS_HOUR)} jam lalu`;
  }
  const time = formatEventTime(iso, clock.timeZone);
  if (group === 'yesterday') return `${INBOX_COPY.yesterday} ${time}`;
  return `${shortDay(iso, clock.timeZone)} ${time}`;
}

type Payload = Record<string, unknown>;
const str = (p: Payload, key: string) => (typeof p[key] === 'string' ? (p[key] as string) : null);
const num = (p: Payload, key: string) => (typeof p[key] === 'number' ? (p[key] as number) : null);

/** The sentence a card shows; a kind this build does not know still reads as news, not as a blank. */
export const headlineOf = (item: InboxItem) => item.sentence ?? INBOX_COPY.unknownSentence;

/** The leave range of a leave card, "14–16 Okt 2026 · 3 hari", or null when the payload lacks dates. */
function leaveLine(p: Payload): string | null {
  const start = str(p, 'startDate');
  const end = str(p, 'endDate');
  if (!start || !end) return null;
  const days = num(p, 'days');
  const range = formatLeaveRange(start, end);
  return days === null ? range : `${range} · ${leaveDaysLabel(days)}`;
}

/** What the approver needs to decide: the range and how many of the requester's tasks fall inside it. */
export function leaveRangeOf(item: InboxItem): string | null {
  const start = str(item.payload, 'startDate');
  const end = str(item.payload, 'endDate');
  return start && end ? formatLeaveRange(start, end) : null;
}

/**
 * The lines between the sentence and the "Proyek · waktu" line: the task or event the card is about,
 * its excerpt, the leave range. Only what the payload snapshot holds, so no extra request per card.
 */
export function detailLines(item: InboxItem, clock: InboxClock): string[] {
  const p = item.payload;
  const lines: string[] = [];
  const title = str(p, 'title');
  const number = num(p, 'number');
  if (item.ref.type === 'task' || item.ref.type === 'comment') {
    if (number !== null && title) lines.push(`#${number} ${title}`);
  } else if (item.ref.type === 'event') {
    if (title) lines.push(title);
    const startsAt = str(p, 'startsAt');
    if (startsAt)
      lines.push(
        `${shortDay(startsAt, clock.timeZone)} · ${formatEventTime(startsAt, clock.timeZone)}`,
      );
  } else if (item.ref.type === 'leave') {
    const range = leaveLine(p);
    if (range) lines.push(range);
    const due = num(p, 'dueTasks');
    if (item.kind === 'leave_requested' && due !== null) lines.push(dueTasksLabel(due));
  }
  const excerpt = str(p, 'excerpt');
  if (excerpt) lines.push(`"${excerpt}"`);
  return lines;
}

/** "Proyek Atlas · 10 menit lalu", or just the time when the card has no project (leave, account). */
export function contextLine(item: InboxItem, clock: InboxClock): string {
  const at = relativeTime(
    item.lane === 'action' ? item.createdAt : item.updatedAt,
    item.group,
    clock,
  );
  const project = str(item.payload, 'projectName');
  return project ? `${project} · ${at}` : at;
}

/** The two-button leave approval card; every other kind has one button. */
export const isLeaveApproval = (item: InboxItem) =>
  item.kind === 'leave_requested' && item.secondaryButton !== null;
