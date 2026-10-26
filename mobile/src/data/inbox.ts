/**
 * The Inbox for the screens: the cards that need a response, and the latest updates by day.
 *
 * Both tabs read `GET /api/app/inbox` through `inbox.api.ts`; this module only maps one wire card to
 * one row. `getInbox()` stays **synchronous** (the user's decision, 26 Oct 2026): it reads the store
 * the fetch layer filled, so the screen has no loading dialect of its own.
 *
 * Two things come from the server and are shown as they came (K5): the card's `sentence` and its
 * button copy, both Indonesian. Everything mobile words itself — the day headings, the empty states
 * — stays English. The day bucket is the server's `group` too; recomputing it here would put a card
 * on the wrong day for anyone whose phone is in another zone (K2).
 */

import { today } from './clock';
import { monthDay } from './dates';
import type { InboxItemWire, InboxPageWire } from './inbox.api';
import { inboxActionResource, inboxInfoResource } from './inbox.api';
import type { InboxHref } from './inbox.links';
import { refHref } from './inbox.links';
import { instantDate, instantIsOn, instantTime } from './instant';
import type { Role } from './sample';

export type InboxTab = 'respond' | 'updates';
export type { InboxHref } from './inbox.links';
export { refHref } from './inbox.links';

/** Who a card is about: a person (with their real photo), or the system itself. */
export type InboxLead = { kind: 'person'; name: string; image: string | null } | { kind: 'system' };

/** Under a card's header: the quoted comment it carries, or the thing it is about. */
export type CardBody = { text: string; tone: 'bold' | 'quote' };

export type RespondCard = {
  /** The card's own id, which is also what "mark read" takes. */
  key: string;
  lead: InboxLead;
  /** The server's sentence, in Indonesian, as it came (K5). */
  title: string;
  /** "#17 · Atlas Project · 10:05", put together here from `ref`, `payload` and the card's instant. */
  meta: string;
  body?: CardBody;
  /** The server's own button copy; a card without one gets no button. */
  action: string | null;
  href: InboxHref;
};

export type UpdateRow = {
  key: string;
  lead: InboxLead;
  title: string;
  meta: string;
  /** Clock time of the card in the team zone, shown on the right. */
  time: string;
  href: InboxHref;
  unread: boolean;
};

export type UpdateGroupKey = 'today' | 'yesterday' | 'older';
export type UpdateGroup = { key: UpdateGroupKey; rows: UpdateRow[] };

export type InboxData = {
  respond: RespondCard[];
  updates: UpdateGroup[];
  /** A page of each lane is loaded; true when the server says there is more behind it. */
  moreRespond: boolean;
  moreUpdates: boolean;
};

/** Day buckets in the order they are shown; a bucket with no card is dropped by the screen. */
const GROUPS: readonly UpdateGroupKey[] = ['today', 'yesterday', 'older'];

const EMPTY_PAGE: InboxPageWire = { items: [], nextCursor: null };

const page = (data: InboxPageWire | null): InboxPageWire => data ?? EMPTY_PAGE;

const text = (payload: Record<string, unknown>, key: string): string | undefined =>
  typeof payload[key] === 'string' ? (payload[key] as string) : undefined;

const leadOf = (item: InboxItemWire): InboxLead =>
  item.actor
    ? { kind: 'person', name: item.actor.name, image: item.actor.image }
    : { kind: 'system' };

/**
 * When something is from: its clock time today, its date before that. Not "10 minutes ago": the app
 * has no live clock of its own, and a relative label frozen at the last request would be a lie.
 *
 * Exported because Home's activity rows label their instants the same way, and one rule for "when"
 * in one place beats two that drift.
 */
export const whenLabel = (instant: string): string =>
  instantIsOn(instant, today()) ? instantTime(instant) : monthDay(instantDate(instant));

/** "#17 · Atlas Project · 10:05", skipping whatever the card does not carry. */
function metaOf(item: InboxItemWire, instant: string): string {
  const parts = [
    item.ref.number === null ? undefined : `#${item.ref.number}`,
    text(item.payload, 'projectName'),
    whenLabel(instant),
  ];
  return parts.filter(Boolean).join(' · ');
}

/**
 * The card's line. A kind this build does not know arrives without a sentence (the server says so
 * rather than guessing); the payload title stands in, and a card with neither is dropped instead of
 * drawn blank.
 */
const lineOf = (item: InboxItemWire): string | undefined =>
  item.sentence ?? text(item.payload, 'title');

/** The quoted comment the card carries, else the thing it is about. */
function bodyOf(item: InboxItemWire): CardBody | undefined {
  const excerpt = text(item.payload, 'excerpt');
  if (excerpt) return { text: excerpt, tone: 'quote' };
  // A sentence of its own already names the thing; repeating the title under it says nothing.
  const title = item.sentence ? undefined : text(item.payload, 'title');
  return title ? { text: title, tone: 'bold' } : undefined;
}

function respondCard(item: InboxItemWire): RespondCard | null {
  const title = lineOf(item);
  if (!title) return null;
  return {
    key: item.id,
    lead: leadOf(item),
    title,
    meta: metaOf(item, item.createdAt),
    body: bodyOf(item),
    action: item.button,
    href: refHref(item.ref),
  };
}

function updateRow(item: InboxItemWire): UpdateRow | null {
  const title = lineOf(item);
  if (!title) return null;
  return {
    key: item.id,
    lead: leadOf(item),
    title,
    meta: metaOf(item, item.updatedAt),
    time: instantTime(item.updatedAt),
    href: refHref(item.ref),
    unread: !item.read,
  };
}

/**
 * "Needs your response", from the work queue the server sends.
 *
 * The two parameters are ignored and only kept so Profil and the More panel (another wave's files)
 * keep compiling while they still pass them: the cards are the caller's own, decided by the server,
 * not by the role the screen was rendered as.
 */
export function respondCards(_role?: Role, _decided?: unknown): RespondCard[] {
  return page(inboxActionResource.current())
    .items.map(respondCard)
    .filter((card): card is RespondCard => card !== null);
}

/** "Latest updates", in the day buckets the server put them in. */
export function updateGroups(): UpdateGroup[] {
  const items = page(inboxInfoResource.current()).items;
  return GROUPS.map((key) => ({
    key,
    rows: items
      .filter((item) => item.group === key)
      .map(updateRow)
      .filter((row): row is UpdateRow => row !== null),
  }));
}

/** Both Inbox tabs, read from the stores. */
export const getInbox = (): InboxData => ({
  respond: respondCards(),
  updates: updateGroups(),
  moreRespond: page(inboxActionResource.current()).nextCursor !== null,
  moreUpdates: page(inboxInfoResource.current()).nextCursor !== null,
});
