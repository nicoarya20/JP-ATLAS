/**
 * Meeting minutes (S7 E-05): the first save, the optimistic lock two writers race on, who may
 * write at all, the 20.000-character limit, the frozen states (cancelled, trashed, already final),
 * and the promise that the body never reaches a log line.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { eventNote, project as projectTable } from '../../server/db/schema';
import { EVENT_NOTE_BODY_MAX } from '../../server/event/events.dto';
import {
  EVENT_NOTE_MESSAGES,
  noteBadge,
  type SaveNoteResult,
  saveNote,
} from '../../server/event/events.notes';
import { logger } from '../../server/logger';
import { toPrincipal } from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { createEventFactory, type EventInput } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'enote' });
const perTest = createEventFactory({ tag: 'enote-t', now: () => ATLAS_NOW });

afterEach(() => perTest.flush());
afterAll(async () => {
  await perTest.flush();
  await cleaner.flushAll();
});

const principal = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

let lead: TestUser;
let host: TestUser;
let guest: TestUser;
let bystander: TestUser;
let viewer: TestUser;
let outsider: TestUser;
let admin: TestUser;
let project: TestProject;
let trashedProject: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    host = await f.user();
    guest = await f.user();
    bystander = await f.user();
    viewer = await f.user();
    outsider = await f.user();
    admin = await f.user({ role: 'admin' });
    project = await f.project({
      lead,
      members: [
        [host, 'member'],
        [guest, 'member'],
        // In the project but not in the room: the case that separates "member" from "guest".
        [bystander, 'member'],
        [viewer, 'viewer'],
      ],
    });
    trashedProject = await f.project({ lead });
    await db
      .update(projectTable)
      .set({ deletedAt: ATLAS_NOW, deletedBy: lead.id })
      .where(eq(projectTable.id, trashedProject.id));
  });
});

/** A meeting in the shared project, hosted by `host`, with `guest` invited. */
const meeting = (over: Partial<EventInput> = {}) =>
  perTest.event({ creator: host, project, guests: [guest], ...over });

/** Narrows a save that was expected to work, failing with the refusal code when it did not. */
function ok(res: SaveNoteResult) {
  if (!res.ok) throw new Error(`save refused with ${res.code}`);
  return res;
}

/** The refusal arm, so a test can read `latest` without widening every assertion. */
function refused(res: SaveNoteResult) {
  if (res.ok) throw new Error('expected the save to be refused');
  return res;
}

const noteRowOf = (eventId: string) =>
  db.select().from(eventNote).where(eq(eventNote.eventId, eventId));

describe('saveNote', () => {
  it('writes the first minutes of a meeting as a draft', async () => {
    const e = await meeting();
    const res = ok(await saveNote(principal(host), { eventId: e.id, body: 'Poin satu.' }));
    expect(res.note.body).toBe('Poin satu.');
    expect(res.note.status).toBe('draft');
    expect(res.badge).toBe('draft');

    const [row] = await noteRowOf(e.id);
    expect(row?.body).toBe('Poin satu.');
    expect(row?.writtenBy).toBe(host.id);
  });

  it('saves again on top of the version it was given', async () => {
    const e = await meeting();
    const first = ok(await saveNote(principal(host), { eventId: e.id, body: 'Draf awal.' }));
    const second = ok(
      await saveNote(principal(guest), {
        eventId: e.id,
        body: 'Draf kedua.',
        baseUpdatedAt: first.note.updatedAt,
      }),
    );
    expect(second.note.body).toBe('Draf kedua.');
    expect(await noteRowOf(e.id)).toHaveLength(1);
    // The author of record moves with the save: minutes are written by whoever saved last.
    expect((await noteRowOf(e.id))[0]?.writtenBy).toBe(guest.id);
  });

  it('lets a guest, the project manager and an Admin write, each on the last version', async () => {
    const e = await meeting();
    let last = ok(await saveNote(principal(guest), { eventId: e.id, body: 'Dari peserta.' }));
    for (const [who, body] of [
      [lead, 'Dari pengelola.'],
      [admin, 'Dari admin.'],
    ] as const) {
      last = ok(
        await saveNote(principal(who), { eventId: e.id, body, baseUpdatedAt: last.note.updatedAt }),
      );
      expect(last.note.body).toBe(body);
    }
  });

  it('marks a draft final, then refuses every further save with the newest text', async () => {
    const e = await meeting();
    const draft = ok(await saveNote(principal(host), { eventId: e.id, body: 'Hasil rapat.' }));
    const final = ok(
      await saveNote(principal(host), {
        eventId: e.id,
        body: 'Hasil rapat.',
        status: 'confirmed',
        baseUpdatedAt: draft.note.updatedAt,
      }),
    );
    expect(final.note.status).toBe('confirmed');
    expect(final.badge).toBe('confirmed');

    const again = refused(
      await saveNote(principal(host), {
        eventId: e.id,
        body: 'Tambahan setelah final.',
        baseUpdatedAt: final.note.updatedAt,
      }),
    );
    expect(again.code).toBe('WRONG_STATE');
    expect(again.error).toBe(EVENT_NOTE_MESSAGES.final);
    expect(again.latest?.body).toBe('Hasil rapat.');

    // Not even back to draft: the status a confirmed document carries is the one it keeps.
    expect(
      await saveNote(principal(lead), {
        eventId: e.id,
        body: 'Hasil rapat.',
        status: 'draft',
        baseUpdatedAt: final.note.updatedAt,
      }),
    ).toMatchObject({ ok: false, code: 'WRONG_STATE' });
  });
});

describe('the optimistic lock', () => {
  it('refuses the second of two writers on the same version, handing over the newer text', async () => {
    const e = await meeting();
    const opened = ok(await saveNote(principal(host), { eventId: e.id, body: 'Versi satu.' }));

    const fast = ok(
      await saveNote(principal(host), {
        eventId: e.id,
        body: 'Versi dua, dari yang cepat.',
        baseUpdatedAt: opened.note.updatedAt,
      }),
    );
    // The same base the fast writer used: this is the stale save the lock exists for.
    const slow = refused(
      await saveNote(principal(guest), {
        eventId: e.id,
        body: 'Versi dua, dari yang lambat.',
        baseUpdatedAt: opened.note.updatedAt,
      }),
    );

    expect(slow.code).toBe('NOTE_CONFLICT');
    expect(slow.error).toBe(EVENT_NOTE_MESSAGES.conflict);
    // The loser is handed what won, so the page can offer "Muat versi terbaru" (P6 §4).
    expect(slow.latest).toEqual(fast.note);
    expect((await noteRowOf(e.id))[0]?.body).toBe('Versi dua, dari yang cepat.');
  });

  it('refuses a writer who thinks there are no minutes while someone has written them', async () => {
    const e = await meeting();
    const first = ok(await saveNote(principal(host), { eventId: e.id, body: 'Sudah ditulis.' }));
    const blind = refused(
      await saveNote(principal(guest), { eventId: e.id, body: 'Saya mulai dari nol.' }),
    );
    expect(blind.code).toBe('NOTE_CONFLICT');
    expect(blind.latest).toEqual(first.note);
  });

  it('refuses a base version for a meeting that has no minutes at all', async () => {
    const e = await meeting();
    const res = refused(
      await saveNote(principal(host), {
        eventId: e.id,
        body: 'Menimpa yang tidak ada.',
        baseUpdatedAt: ATLAS_NOW.toISOString(),
      }),
    );
    expect(res.code).toBe('NOTE_CONFLICT');
    expect(res.latest).toBeNull();
    expect(await noteRowOf(e.id)).toHaveLength(0);
  });

  it('answers VALIDATION, not a crash, for a base version that is not a date', async () => {
    const e = await meeting();
    expect(
      await saveNote(principal(host), { eventId: e.id, body: 'x', baseUpdatedAt: 'kemarin' }),
    ).toMatchObject({ ok: false, code: 'VALIDATION', error: EVENT_NOTE_MESSAGES.badBase });
  });

  it('keeps the lock usable on minutes written straight into the database', async () => {
    // The factory inserts with the database's own `now()` (microseconds) while a client only ever
    // sees the millisecond ISO string, so the version match must survive that truncation.
    const e = await meeting({ note: { body: 'Dari seed.' } });
    const seeded = (await noteRowOf(e.id))[0];
    if (!seeded) throw new Error('the factory did not write the minutes');
    const res = ok(
      await saveNote(principal(host), {
        eventId: e.id,
        body: 'Lanjutan.',
        baseUpdatedAt: seeded.updatedAt.toISOString(),
      }),
    );
    expect(res.note.body).toBe('Lanjutan.');
  });
});

describe('who may write', () => {
  it.each([
    ['a Pemantau of the project', () => viewer],
    ['a project member who is neither guest nor host', () => bystander],
  ])('refuses %s with 403 NOT_MEMBER', async (_label, who) => {
    const e = await meeting();
    expect(
      await saveNote(principal(who()), { eventId: e.id, body: 'Ikut menulis.' }),
    ).toMatchObject({ ok: false, code: 'NOT_MEMBER' });
    expect(await noteRowOf(e.id)).toHaveLength(0);
  });

  it('hides a meeting it may not see behind the same 404 a missing one gives', async () => {
    const e = await meeting();
    expect(
      await saveNote(principal(outsider), { eventId: e.id, body: 'Dari luar.' }),
    ).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(
      await saveNote(principal(host), { eventId: 'enote-no-such-event', body: 'Hantu.' }),
    ).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });
});

describe('frozen events', () => {
  it('refuses the minutes of a cancelled meeting with 409 EVENT_CANCELED', async () => {
    const e = await meeting({ canceledAt: ATLAS_NOW, cancelReason: 'Ruangan dipakai' });
    expect(
      await saveNote(principal(host), { eventId: e.id, body: 'Tetap ditulis.' }),
    ).toMatchObject({ ok: false, code: 'EVENT_CANCELED', error: EVENT_NOTE_MESSAGES.canceled });
  });

  it('refuses a meeting in the Trash and one whose project is in the Trash', async () => {
    const trashed = await meeting({ deletedAt: ATLAS_NOW });
    expect(
      await saveNote(principal(host), { eventId: trashed.id, body: 'Dari Sampah.' }),
    ).toMatchObject({ ok: false, code: 'WRONG_STATE' });

    const orphan = await perTest.event({ creator: lead, project: trashedProject });
    expect(
      await saveNote(principal(lead), { eventId: orphan.id, body: 'Proyeknya hilang.' }),
    ).toMatchObject({ ok: false, code: 'PROJECT_IN_TRASH' });
  });
});

describe('limits and logging', () => {
  it('accepts a body exactly at the limit and refuses one character more', async () => {
    const e = await meeting();
    const atLimit = 'a'.repeat(EVENT_NOTE_BODY_MAX); // test-only
    const res = ok(await saveNote(principal(host), { eventId: e.id, body: atLimit }));
    expect(res.note.body).toHaveLength(EVENT_NOTE_BODY_MAX);

    expect(
      await saveNote(principal(host), {
        eventId: e.id,
        body: `${atLimit}a`,
        baseUpdatedAt: res.note.updatedAt,
      }),
    ).toMatchObject({ ok: false, code: 'VALIDATION', error: EVENT_NOTE_MESSAGES.tooLong });
    // Refused before any write: the stored minutes are still the ones that fitted.
    expect((await noteRowOf(e.id))[0]?.body).toHaveLength(EVENT_NOTE_BODY_MAX);
  });

  it('never puts the body in a log line', async () => {
    const e = await meeting();
    const info = spyOn(logger, 'info');
    try {
      const secret = 'Nomor HP narasumber 0812 dan angka gajinya'; // test-only
      const first = ok(await saveNote(principal(host), { eventId: e.id, body: secret }));
      ok(
        await saveNote(principal(host), {
          eventId: e.id,
          body: `${secret} lagi`,
          baseUpdatedAt: first.note.updatedAt,
        }),
      );
      const logged = JSON.stringify(info.mock.calls);
      expect(logged).not.toContain('0812');
      expect(logged).toContain('event note saved');
      // What a log line may carry: ids, the status and a character count.
      expect(info.mock.calls.at(-1)?.[0]).toMatchObject({
        eventId: e.id,
        status: 'draft',
        length: secret.length + 5,
        actorId: host.id,
      });
    } finally {
      info.mockRestore();
    }
  });

  it('shows "no minutes yet" only when there is no document at all', () => {
    expect(noteBadge(null)).toBe('none');
    expect(noteBadge('draft')).toBe('draft');
    expect(noteBadge('confirmed')).toBe('confirmed');
  });
});
