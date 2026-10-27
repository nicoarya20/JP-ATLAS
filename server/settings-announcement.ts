/**
 * Admin announcement banner stored as JSON on the settings row (P13 RD-01). NULL = no
 * announcement at all, which is why `parseAnnouncement` returns `null` instead of a blank
 * banner: "nothing to say" and "an empty announcement" must not look the same to the shell.
 */
import { readSettingsRow, type SettingsRow, upsertSettingsRow } from './settings.core';

/** Tone the banner is painted in; matches the role palettes (`warn`, `danger`) plus the neutral one. */
export const ANNOUNCEMENT_LEVELS = ['info', 'warn', 'danger'] as const;
export type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number];

/** A banner is one sentence, not a document: longer text pushes the page content off a phone screen. */
export const ANNOUNCEMENT_TEXT_MAX = 500;

export type Announcement = {
  text: string;
  level: AnnouncementLevel;
  /** False keeps the text saved but hides the banner, so Admin can prepare one without showing it. */
  active: boolean;
  /**
   * ISO instant up to which a reader may close the banner; NULL = closable for good. Past that
   * instant the banner stays on screen, which is how an unmissable deadline notice is expressed.
   */
  dismissibleUntil: string | null;
};

export const ANNOUNCEMENT_DEFAULT_LEVEL: AnnouncementLevel = 'info';

function isLevel(value: unknown): value is AnnouncementLevel {
  return ANNOUNCEMENT_LEVELS.includes(value as AnnouncementLevel);
}

/**
 * Read the stored banner. An unreadable or level-less row degrades to the neutral tone rather
 * than throwing: a bad row must not take the whole app shell down with it.
 */
export function parseAnnouncement(row: SettingsRow | null): Announcement | null {
  const raw = row?.announcement;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const a = raw as Partial<Announcement>;
  const text = typeof a.text === 'string' ? a.text.trim() : '';
  if (!text) return null;
  return {
    text,
    level: isLevel(a.level) ? a.level : ANNOUNCEMENT_DEFAULT_LEVEL,
    active: Boolean(a.active),
    dismissibleUntil: typeof a.dismissibleUntil === 'string' ? a.dismissibleUntil : null,
  };
}

/** Validate what Admin submitted; throws with an Indonesian message so the API can answer 400. */
export function normalizeAnnouncement(input: Announcement): Announcement {
  const text = (input.text ?? '').trim();
  if (!text) throw new Error('Teks pengumuman tidak boleh kosong.');
  if (text.length > ANNOUNCEMENT_TEXT_MAX)
    throw new Error(`Teks pengumuman maksimal ${ANNOUNCEMENT_TEXT_MAX} karakter.`);
  if (!isLevel(input.level))
    throw new Error(
      `Level pengumuman "${String(input.level)}" tidak dikenal; pakai ${ANNOUNCEMENT_LEVELS.join(', ')}.`,
    );
  let dismissibleUntil: string | null = null;
  if (input.dismissibleUntil !== null && input.dismissibleUntil !== undefined) {
    const at = new Date(input.dismissibleUntil);
    if (Number.isNaN(at.getTime()))
      throw new Error(
        `Tanggal "dismissibleUntil" tidak valid: "${String(input.dismissibleUntil)}".`,
      );
    // Stored as an ISO string, never a Date: the column is jsonb and the shell compares strings.
    dismissibleUntil = at.toISOString();
  }
  return { text, level: input.level, active: Boolean(input.active), dismissibleUntil };
}

/** The banner the app shell should render, or null when there is nothing to show. */
export async function getAnnouncement(): Promise<Announcement | null> {
  return parseAnnouncement(await readSettingsRow());
}

/** Persist the banner; `null` clears it back to "no announcement". */
export async function upsertAnnouncement(input: Announcement | null): Promise<Announcement | null> {
  await upsertSettingsRow({ announcement: input ? normalizeAnnouncement(input) : null });
  return parseAnnouncement(await readSettingsRow());
}

/** What the app shell renders: text + tone, plus whether this reader is allowed to close it. */
export type ShellAnnouncement = { text: string; level: AnnouncementLevel; dismissible: boolean };

/**
 * Resolve the banner for `frameInfo()`: inactive or absent announcements become `null` here, so
 * the shell never has to know the difference. `dismissible` is decided on the server because the
 * reader's clock is not a fact we control — a phone one day behind must not be able to close a
 * notice the office decided is unmissable.
 */
export function shellAnnouncement(
  a: Announcement | null,
  now: Date = new Date(),
): ShellAnnouncement | null {
  if (!a?.active) return null;
  const until = a.dismissibleUntil ? new Date(a.dismissibleUntil) : null;
  const dismissible = !until || Number.isNaN(until.getTime()) || now.getTime() <= until.getTime();
  return { text: a.text, level: a.level, dismissible };
}

/** The banner the signed-in areas show, already filtered and resolved. */
export async function getShellAnnouncement(): Promise<ShellAnnouncement | null> {
  return shellAnnouncement(await getAnnouncement());
}
