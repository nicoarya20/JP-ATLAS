// Inbox for the screens (prototype inbox.respond.jsx / inbox.updates.jsx / inbox.shared.js): the cards that need my
// response and the latest updates, each with the person behind it and the screen it opens. Phase 2 reads the API here.
import { eventHref } from './events.shared';
import { eventsStore } from './events.store';
import { actor, type InboxHref, link } from './inbox.links';
import { me } from './people';
import { INBOX_RESPOND, type Role } from './sample';
import { ADMIN_REVIEW_WHY, INBOX_UPDATES, type InboxDay } from './sample/inbox.extra';
import type { PendingUser } from './sample/users';
import { type Decisions, getDecisions, waitingUsers } from './users';

export type InboxTab = 'respond' | 'updates';
export type { InboxHref } from './inbox.links';
export { actor, link } from './inbox.links';

/** Who a card is about: a person's avatar, the AI mark, or a stack of avatars. */
export type InboxLead =
  | { kind: 'person'; name: string }
  | { kind: 'ai' }
  | { kind: 'people'; names: string[] };

export type RespondCard = {
  key: string;
  lead: InboxLead;
  title: string;
  meta: string;
  /** Under the header: a bold line, a muted note, or a quoted comment. */
  body: { text: string; tone: 'bold' | 'muted' | 'quote' };
  /** Muted line under a bold body (why the Admin reviews). */
  why?: string;
  action: string;
  href: InboxHref;
};

export type UpdateRow = {
  title: string;
  meta: string;
  /** Last part of the meta ("30 min ago"), shown on the right. */
  time: string;
  actor: string;
  href: InboxHref;
  unread: boolean;
};

export type UpdateDay = { day: InboxDay; rows: UpdateRow[] };

export type InboxData = { respond: RespondCard[]; updates: UpdateDay[] };

const DAYS: readonly InboxDay[] = ['Today', 'Yesterday'];

const personLead = (title: string, meta?: string): InboxLead => ({
  kind: 'person',
  name: actor(title, meta),
});

function approvals(waiting: readonly PendingUser[]): RespondCard {
  const names = waiting.map((u) => u.full);
  const n = waiting.length;
  return {
    key: 'approvals',
    lead: { kind: 'people', names },
    // The prototype only words two ("2 new users"); one left after a decision reads "1 new user".
    title: `${n} new user${n === 1 ? '' : 's'} awaiting approval`,
    meta: names.join(', '),
    body: {
      text: 'Approval cards are for Admins only. Once one Admin decides, the card disappears for all Admins.',
      tone: 'muted',
    },
    action: 'Open Users',
    href: '/more/users',
  };
}

/**
 * "Needs your response": Member and PM get three cards; Admin swaps the second for the approvals card, first, which
 * goes once no sign-up waits (`decided`: the Users decisions).
 */
export function respondCards(role: Role, decided: Decisions = getDecisions()): RespondCard[] {
  const [rv, second, mn] = INBOX_RESPOND[role];
  const review: RespondCard = {
    key: 'review',
    lead: personLead(rv.title),
    title: rv.title,
    meta: rv.meta,
    body: { text: rv.sub, tone: 'bold' },
    why: role === 'admin' ? ADMIN_REVIEW_WHY : undefined,
    action: rv.action,
    href: link(rv.meta),
  };
  const mention: RespondCard = {
    key: 'mention',
    lead: personLead(mn.title),
    title: mn.title,
    meta: mn.meta,
    body: { text: mn.sub.replace('@Nico', `@${me(role).name}`), tone: 'quote' },
    action: mn.action,
    href: link(mn.title),
  };
  if (role === 'admin') {
    const waiting = waitingUsers(decided);
    return waiting.length ? [approvals(waiting), review, mention] : [review, mention];
  }
  const daily = eventsStore.get().list.find((e) => e.id === 'daily');
  const pmSecond = role === 'pm' && daily;
  return [
    review,
    {
      key: 'second',
      lead: pmSecond ? { kind: 'ai' } : personLead(second.title),
      title: second.title,
      meta: second.meta,
      body: { text: second.sub, tone: pmSecond ? 'muted' : 'bold' },
      action: second.action,
      href: pmSecond ? eventHref(daily) : link(second.sub),
    },
    mention,
  ];
}

/** "Latest updates" by day; Today's rows are unread until "Mark all as read". */
export function updateDays(role: Role, allRead: boolean): UpdateDay[] {
  return DAYS.map((day) => ({
    day,
    rows: INBOX_UPDATES[role]
      .filter((u) => u.day === day)
      .map((u) => {
        const parts = u.meta.split(' · ');
        const time = (parts.pop() ?? '').replace('Yesterday ', '');
        return {
          title: u.title,
          meta: parts.join(' · '),
          time,
          actor: actor(u.title, u.meta),
          href: link(`${u.title} ${u.meta}`),
          unread: day === 'Today' && !allRead,
        };
      }),
  }));
}

/** Both Inbox tabs for `role`. */
export const getInbox = (
  role: Role,
  allRead: boolean,
  decided: Decisions = getDecisions(),
): InboxData => ({
  respond: respondCards(role, decided),
  updates: updateDays(role, allRead),
});
