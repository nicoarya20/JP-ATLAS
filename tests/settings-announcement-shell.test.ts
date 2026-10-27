/**
 * AD-05: `shellAnnouncement` resolves the stored banner into what the app shell renders. The point
 * under test is that "may this reader close it?" is decided on the server, from a clock we control,
 * not from the reader's device — an out-of-date phone must not be able to dismiss a notice the
 * office marked unmissable, nor be stuck with one whose closing window has already passed.
 */
import { describe, expect, test } from 'bun:test';
import { type Announcement, shellAnnouncement } from '../server/settings-announcement';

const base: Announcement = { text: 'Kantor libur Jumat.', level: 'warn', active: true, dismissibleUntil: null };

describe('shellAnnouncement', () => {
  test('nothing to show when absent or inactive', () => {
    expect(shellAnnouncement(null)).toBeNull();
    expect(shellAnnouncement({ ...base, active: false })).toBeNull();
  });

  test('an active banner with no window is always closable', () => {
    expect(shellAnnouncement(base)).toEqual({ text: base.text, level: 'warn', dismissible: true });
  });

  test('closable up to and including the window, then pinned open past it', () => {
    const now = new Date('2026-10-27T12:00:00.000Z');
    const future = { ...base, dismissibleUntil: '2026-10-28T00:00:00.000Z' };
    const past = { ...base, dismissibleUntil: '2026-10-26T00:00:00.000Z' };
    expect(shellAnnouncement(future, now)?.dismissible).toBe(true);
    expect(shellAnnouncement(past, now)?.dismissible).toBe(false);
    // Exactly at the boundary the reader may still close it (<=, not <).
    expect(shellAnnouncement({ ...base, dismissibleUntil: now.toISOString() }, now)?.dismissible).toBe(
      true,
    );
  });

  test('an unparseable window degrades to closable rather than trapping the reader', () => {
    expect(shellAnnouncement({ ...base, dismissibleUntil: 'besok' })?.dismissible).toBe(true);
  });
});
