/**
 * Which edits a guest has to hear about (P6 §6 E-04, R07 §3.7). The reminders, the agenda text and
 * the event kind are the organiser's own business; the title, the time and the place are what a
 * guest planned around. Pure on purpose: `events.service.ts` calls it with the row it already loaded.
 */

type Edit = {
  title?: string;
  locationType?: string | null;
  locationText?: string | null;
  meetingUrl?: string | null;
};

type Current = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  locationType: string | null;
  locationText: string | null;
  meetingUrl: string | null;
};

/** True when `edit` (with the resolved `span`) differs from `current` in a field guests act on. */
export function changesWhatGuestsSee(
  current: Current,
  edit: Edit,
  span: { startsAt: Date; endsAt: Date },
): boolean {
  const differs = <T>(next: T | undefined, now: T) => next !== undefined && next !== now;
  return (
    span.startsAt.getTime() !== current.startsAt.getTime() ||
    span.endsAt.getTime() !== current.endsAt.getTime() ||
    differs(edit.title, current.title) ||
    differs(edit.locationType, current.locationType) ||
    differs(edit.locationText, current.locationText) ||
    differs(edit.meetingUrl, current.meetingUrl)
  );
}
