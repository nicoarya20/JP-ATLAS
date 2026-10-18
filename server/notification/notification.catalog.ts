/**
 * Catalog of Inbox card kinds (S3 I02, P5 §5.2): the lane each kind lands in, the preference
 * category that may silence it, an optional time-to-live and whether S3 actually sends it. Kinds for
 * S4 (Periksa, mention) and S7 (Events) are reserved on purpose, so shipping them later changes no
 * table, no API shape and no stored row — only the `shipped` flag (P5 §9 K-1). The copy is the
 * Indonesian sentence the card shows, in the project glossary ("yang mengerjakan", never "assignee");
 * placeholders are filled by `cardSentence`, so a card never renders a raw template.
 */

import type { NotificationPrefCategory } from '../db/schema.notification';
import { NOTIFICATION_LANES, RESOLVE_REASONS } from '../db/schema.notification';
import type { CopyVars, NotificationKind, NotificationLane } from './notification.types';

export type { NotificationPrefCategory };
export { NOTIFICATION_LANES, RESOLVE_REASONS };

/**
 * What a kind belongs to for preference purposes. `action` cards cannot be switched off — they are
 * the "Perlu Anda tanggapi" work queue; `news` and `event_reminder` match `notification_pref.category`.
 */
export const NOTIFICATION_CATEGORIES = ['action', 'news', 'event_reminder'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type KindMeta = {
  lane: NotificationLane;
  category: NotificationCategory;
  /** Days after which the sweeper may drop an unresolved card; absent = only the global retention applies. */
  ttlDays?: number;
  /** False while the kind is reserved: nothing emits it yet, but reading code must already handle it. */
  shipped: boolean;
};

/** Mention cards expire on their own: an unanswered mention stops being actionable (P5 §6 I20). */
const MENTION_TTL_DAYS = 14;

/** Days a card is kept before the daily sweep drops it; 30, not R12's 90, the stricter one (P5 §9 K-3). */
export const NOTIF_RETENTION_DAYS = 30;

/** Every kind the Inbox knows. Typed against `NotificationPayloadByKind`, so neither list can drift. */
export const NOTIFICATION_KINDS: Readonly<Record<NotificationKind, KindMeta>> = Object.freeze({
  task_assigned: { lane: 'action', category: 'action', shipped: true },
  task_unassigned: { lane: 'info', category: 'news', shipped: true },
  task_done: { lane: 'info', category: 'news', shipped: true },
  task_commented: { lane: 'info', category: 'news', shipped: true },
  task_changed: { lane: 'info', category: 'news', shipped: true },
  project_member_added: { lane: 'info', category: 'news', shipped: true },
  project_role_changed: { lane: 'info', category: 'news', shipped: true },
  // Should, shipped by I14; the Admin queue card has no project, so `project_id` stays NULL.
  user_pending: { lane: 'action', category: 'action', shipped: false },
  // S4 (Periksa): the reviewer flow is still behind TASK_REVIEW_UI_ENABLED.
  task_review_requested: { lane: 'action', category: 'action', shipped: false },
  task_review_fallback: { lane: 'action', category: 'action', shipped: false },
  task_returned: { lane: 'action', category: 'action', shipped: false },
  // S4 (mention): needs the comment composer to send user ids.
  mention: { lane: 'action', category: 'action', ttlDays: MENTION_TTL_DAYS, shipped: false },
  // S7 (Events).
  event_reminder: { lane: 'info', category: 'event_reminder', shipped: false },
  event_invited: { lane: 'action', category: 'action', shipped: false },
});

export type KindCopy = {
  /** Headline when an actor is known; `{actor} {number} {title} {project} {role} {count}` are filled in. */
  sentence: string;
  /** Headline when the card stands for several events (`bundle_count` > 1). */
  bundled?: string;
  /** Headline when the system acted and there is no actor to name. */
  system?: string;
  /** Imperative label of the card's single button (P5 §4: one button per card). */
  button: string;
};

/** Indonesian copy per kind; plain words, no jargon, no role codes (R11 glossary). */
export const NOTIFICATION_COPY: Readonly<Record<NotificationKind, KindCopy>> = Object.freeze({
  task_assigned: {
    sentence: '{actor} menunjuk Anda mengerjakan #{number}',
    system: 'Anda ditunjuk mengerjakan #{number}',
    button: 'Lihat tugas',
  },
  task_unassigned: {
    sentence: '{actor} mengganti yang mengerjakan #{number}',
    system: 'Anda tidak lagi mengerjakan #{number}',
    button: 'Lihat',
  },
  task_done: {
    sentence: '{actor} menandai #{number} selesai',
    system: '#{number} ditandai selesai',
    button: 'Lihat',
  },
  task_commented: {
    sentence: '{actor} menulis komentar di #{number}',
    bundled: '{count} komentar baru di #{number}',
    system: 'Ada komentar baru di #{number}',
    button: 'Lihat',
  },
  task_changed: {
    sentence: '{actor} mengubah #{number}',
    bundled: '{count} perubahan di #{number}',
    system: '#{number} berubah',
    button: 'Lihat',
  },
  project_member_added: {
    sentence: '{actor} menambahkan Anda ke proyek {project}',
    system: 'Anda ditambahkan ke proyek {project}',
    button: 'Lihat',
  },
  project_role_changed: {
    sentence: '{actor} mengubah peran Anda di proyek {project}',
    system: 'Peran Anda di proyek {project} berubah',
    button: 'Lihat',
  },
  user_pending: {
    sentence: '{name} baru mendaftar dan menunggu persetujuan',
    system: '{name} baru mendaftar dan menunggu persetujuan',
    button: 'Buka Pengguna',
  },
  task_review_requested: {
    sentence: '{actor} meminta Anda memeriksa #{number}',
    system: 'Anda diminta memeriksa #{number}',
    button: 'Periksa tugas',
  },
  task_review_fallback: {
    sentence: '#{number} menunggu diperiksa',
    system: '#{number} menunggu diperiksa',
    button: 'Periksa tugas',
  },
  task_returned: {
    sentence: '{actor} mengembalikan #{number} untuk diperbaiki',
    system: '#{number} dikembalikan untuk diperbaiki',
    button: 'Lihat tugas',
  },
  mention: {
    sentence: '{actor} menyebut nama Anda di #{number}',
    system: 'Nama Anda disebut di #{number}',
    button: 'Balas',
  },
  event_reminder: {
    sentence: 'Acara {title} segera dimulai',
    system: 'Acara {title} segera dimulai',
    button: 'Lihat acara',
  },
  event_invited: {
    sentence: '{actor} mengundang Anda ke acara {title}',
    system: 'Anda diundang ke acara {title}',
    button: 'Lihat acara',
  },
});

const KIND_LIST = Object.keys(NOTIFICATION_KINDS) as NotificationKind[];

/** Every kind in catalog order; the contract tests read this instead of hard-coding a list. */
export const NOTIFICATION_KIND_LIST: ReadonlyArray<NotificationKind> = Object.freeze(KIND_LIST);

/** Whether an arbitrary string (a stored `kind` column, a query parameter) is a known kind. */
export function isNotificationKind(value: unknown): value is NotificationKind {
  return typeof value === 'string' && value in NOTIFICATION_KINDS;
}

/** The kinds S3 really emits; `notify()` refuses the reserved ones so no card appears before its feature. */
export const shippedKinds = () => KIND_LIST.filter((kind) => NOTIFICATION_KINDS[kind].shipped);

/** Kinds of one lane, shipped or not. */
export const kindsByLane = (lane: NotificationLane) =>
  KIND_LIST.filter((kind) => NOTIFICATION_KINDS[kind].lane === lane);

/**
 * The preference row that silences this kind, or null when it cannot be silenced.
 * `action` cards are work, not news, so no preference may hide them (P5 §5.3 butir 3).
 */
export function prefCategoryOf(kind: NotificationKind): NotificationPrefCategory | null {
  const { category } = NOTIFICATION_KINDS[kind];
  return category === 'action' ? null : category;
}

/** Fills `{placeholders}`; an unknown or missing variable leaves no brace and no double space behind. */
function fill(template: string, vars: CopyVars): string {
  return template
    .replace(/\{(\w+)\}/g, (_match, key: string) => {
      const value = (vars as Record<string, unknown>)[key];
      return value === undefined || value === null ? '' : String(value);
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * The sentence a card shows: the bundled wording once it stands for more than one event, the
 * actorless wording when the system acted, otherwise the normal one.
 */
export function cardSentence(kind: NotificationKind, vars: CopyVars = {}): string {
  const copy = NOTIFICATION_COPY[kind];
  const bundled = (vars.count ?? 1) > 1 && copy.bundled ? copy.bundled : undefined;
  const template = bundled ?? (vars.actor ? copy.sentence : (copy.system ?? copy.sentence));
  return fill(template, vars);
}

/** The label of the card's single button. */
export function cardButton(kind: NotificationKind): string {
  return NOTIFICATION_COPY[kind].button;
}
