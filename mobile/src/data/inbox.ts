/**
 * The Inbox as the screens show it, read from the lane resources of `inbox.api.ts`.
 *
 * One server card is one card here (K5): the sentence and the button label are the server's, in
 * the server's words; the app adds only its own furniture — the meta line, the time, "N changes",
 * the day headings. A card whose `sentence` is null is a kind this server build does not know and
 * is left out rather than shown with words the app made up. Nothing is counted from the cards on
 * hand: totals come from `GET /inbox/count`.
 */
import type { Href } from 'expo-router';

import { monthDay } from './dates';
import {
  type InboxCountWire,
  type InboxGroup,
  type InboxItemWire,
  type InboxLane,
  inboxCountResource,
  inboxLaneResource,
} from './inbox.api';
import { appHref } from './inbox.links';
import { instantParts } from './instant';

export type { InboxGroup, InboxLane } from './inbox.api';

export type InboxCard = {
  id: string;
  lane: InboxLane;
  /** Who acted; null for the system or a removed account (no avatar then). */
  actor: { id: string; name: string } | null;
  /** The server's sentence, as it came. */
  sentence: string;
  /** "#12 · Atlas Project": what it is about. Empty when the card names neither. */
  meta: string;
  /** "14:05" for today and yesterday, "Oct 20" before that, in the team's zone. */
  time: string;
  /** A comment's opening words, quoted under the sentence. */
  excerpt: string | null;
  /** "5 changes" for a card that stands for several. */
  bundle: string | null;
  /** The server's button label and where it leads; null when the app has no screen for it. */
  open: { label: string; href: Href } | null;
  read: boolean;
  group: InboxGroup;
};

export type InboxDay = { group: InboxGroup; label: string; cards: InboxCard[] };

export const GROUP_LABEL: Record<InboxGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  older: 'Older',
};

const GROUPS: readonly InboxGroup[] = ['today', 'yesterday', 'older'];

const text = (p: Record<string, unknown>, key: string): string | null =>
  typeof p[key] === 'string' && p[key] !== '' ? (p[key] as string) : null;

/** The instant a card is filed under: when the work arrived, or when the news last changed. */
const instantOf = (w: InboxItemWire) => (w.lane === 'action' ? w.createdAt : w.updatedAt);

function timeOf(w: InboxItemWire): string {
  const at = instantParts(instantOf(w));
  return w.group === 'older' ? monthDay(at.date) : at.time;
}

/** One server card in the screen's shape; null for a kind the server could not word. */
export function toCard(w: InboxItemWire): InboxCard | null {
  if (!w.sentence) return null;
  const number = w.ref.number;
  const meta = [number === null ? null : `#${number}`, text(w.payload, 'projectName')]
    .filter(Boolean)
    .join(' · ');
  const href = appHref(w.href);
  return {
    id: w.id,
    lane: w.lane,
    actor: w.actor ? { id: w.actor.id, name: w.actor.name } : null,
    sentence: w.sentence,
    meta,
    time: timeOf(w),
    excerpt: text(w.payload, 'excerpt'),
    bundle: w.bundleCount > 1 ? `${w.bundleCount} changes` : null,
    open: href && w.button ? { label: w.button, href } : null,
    read: w.read,
    group: w.group,
  };
}

export type InboxLaneView = {
  cards: InboxCard[];
  /** The cards by the server's day buckets, empty buckets left out. */
  days: InboxDay[];
  /** Another page exists on the server. */
  more: boolean;
};

/** One lane as loaded so far, or null before its first answer. */
export function getInboxLane(lane: InboxLane): InboxLaneView | null {
  const data = inboxLaneResource(lane).current();
  if (!data) return null;
  const cards = data.items.map(toCard).filter((c): c is InboxCard => c !== null);
  const days = GROUPS.map((group) => ({
    group,
    label: GROUP_LABEL[group],
    cards: cards.filter((c) => c.group === group),
  })).filter((d) => d.cards.length > 0);
  return { cards, days, more: data.nextCursor !== null };
}

/** The bell numbers, or null while they are not in. */
export const getInboxCount = (): InboxCountWire | null => inboxCountResource.current();
