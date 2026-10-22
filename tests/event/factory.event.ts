/**
 * Event factory for the E-03 suites: inserts events, guests, minutes and reminder claims, and
 * sweeps them itself. `tests/support/cleanup.ts` has no `event` kind, and `event.project_id` /
 * `event.created_by` are SET NULL, so a project or user swept by the shared cleaner would leave
 * its events behind — this tracker deletes them first and the FK cascades take the children.
 */
import { inArray } from 'drizzle-orm';
import { db } from '../../server/db';
import { event, eventNote, eventParticipant, eventReminder } from '../../server/db/schema';
import type { EventKind, EventLocationType, EventNoteStatus } from '../../server/pm/enums';
import type { TestProject } from '../support/factory.project';
import type { TestUser } from '../support/factory.user';

export type EventInput = {
  title?: string;
  project?: TestProject | null;
  creator: TestUser;
  guests?: readonly TestUser[];
  kind?: EventKind;
  /** Minutes from the suite's `now`; negative is in the past. */
  startsInMin?: number;
  durationMin?: number;
  startsAt?: Date;
  locationType?: EventLocationType | null;
  locationText?: string | null;
  meetingUrl?: string | null;
  agenda?: string | null;
  canceledAt?: Date | null;
  cancelReason?: string | null;
  canceledBy?: TestUser | null;
  deletedAt?: Date | null;
  note?: { body: string; status?: EventNoteStatus } | null;
  /** Reminder offsets to pre-claim, so a test can prove an update clears them. */
  claimed?: readonly number[];
};

export type TestEvent = { id: string; title: string; startsAt: Date; endsAt: Date };

const MS_PER_MIN = 60_000;
const ID_RANDOM_LENGTH = 8;
const DEFAULT_DURATION_MIN = 60;

export type EventFactory = {
  /** Inserts one event with its guest list; the creator is always invited, as the service does. */
  event(input: EventInput): Promise<TestEvent>;
  /** Remembers an id the *service* created, so the sweep covers it too. */
  track(id: string): string;
  /** Deletes what this bucket holds; children go with the event through its CASCADE FKs. */
  flush(): Promise<void>;
};

/**
 * Builds one bucket of event rows. Suites keep two — a `shared` bucket flushed in `afterAll` and a
 * per-test one flushed in `afterEach` — so `beforeAll` fixtures survive the first test's sweep.
 */
export function createEventFactory(opts: { tag: string; now: () => Date }): EventFactory {
  const ids = new Set<string>();
  return {
    track(id) {
      ids.add(id);
      return id;
    },
    async event(input) {
      const id = `${opts.tag}-${crypto.randomUUID().slice(0, ID_RANDOM_LENGTH)}`;
      // Track before the insert so a half-failed row is still swept.
      ids.add(id);
      const startsAt =
        input.startsAt ?? new Date(opts.now().getTime() + (input.startsInMin ?? 60) * MS_PER_MIN);
      const endsAt = new Date(
        startsAt.getTime() + (input.durationMin ?? DEFAULT_DURATION_MIN) * MS_PER_MIN,
      );
      const title = input.title ?? `Acara ${id}`; // test-only
      await db.insert(event).values({
        id,
        title,
        kind: input.kind ?? 'meeting',
        projectId: input.project?.id ?? null,
        startsAt,
        endsAt,
        locationType: input.locationType ?? null,
        locationText: input.locationText ?? null,
        meetingUrl: input.meetingUrl ?? null,
        agenda: input.agenda ?? null,
        canceledAt: input.canceledAt ?? null,
        cancelReason: input.cancelReason ?? null,
        canceledBy: input.canceledBy?.id ?? null,
        createdBy: input.creator.id,
        deletedAt: input.deletedAt ?? null,
        deletedBy: input.deletedAt ? input.creator.id : null,
      });

      const guestIds = [...new Set([input.creator.id, ...(input.guests ?? []).map((g) => g.id)])];
      await db
        .insert(eventParticipant)
        .values(guestIds.map((userId) => ({ eventId: id, userId, addedBy: input.creator.id })));

      if (input.note) {
        await db.insert(eventNote).values({
          id: `${id}-note`,
          eventId: id,
          body: input.note.body,
          status: input.note.status ?? 'draft',
          writtenBy: input.creator.id,
        });
      }
      if (input.claimed?.length) {
        await db
          .insert(eventReminder)
          .values(input.claimed.map((offsetMinutes) => ({ eventId: id, offsetMinutes })));
      }
      return { id, title, startsAt, endsAt };
    },
    async flush() {
      const taken = [...ids];
      ids.clear();
      if (taken.length > 0) await db.delete(event).where(inArray(event.id, taken));
    },
  };
}
