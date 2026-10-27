/**
 * Ubah acara: the ⋯ menu item driven by `can.update`, the values an existing event opens with, the
 * PATCH body (never `projectId` or `participantIds`, which the route declares `t.Never()`), and the
 * loader's 403 with its reason.
 */
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { eventMenuItems } from '../../app/components/events/EventDetailMenu';
import { EventForm } from '../../app/components/events/EventForm';
import { ACTION_COPY } from '../../app/components/events/event-detail.copy';
import { EVENT_FORM_COPY as COPY } from '../../app/lib/event-form.copy';
import {
  editEventValues,
  saveEventChanges,
  toUpdateEventBody,
} from '../../app/lib/event-form.edit';
import { type EventDetail, eventEditHref } from '../../app/lib/events-api';
import { loader } from '../../app/routes/app/event-edit';
import * as eventQuery from '../../server/event/events.query';
import * as guard from '../../server/guard';
import { ANA, BUDI, detail, render } from './event-detail.fixtures';

const WIB = 'Asia/Jakarta'; // test-only
/** The fixture event as the edit form holds it. */
const values_ok = () => editEventValues(detail(), WIB);

describe('the ⋯ menu offers Ubah acara', () => {
  it('lists it first when can.update is true', () => {
    expect(eventMenuItems({ update: true, cancel: true, trash: true }, 'scheduled')).toEqual([
      'edit',
      'cancel',
      'delete',
    ]);
    expect(eventMenuItems({ update: true }, 'scheduled')).toEqual(['edit']);
  });

  it('leaves it out entirely when the server sent no update key', () => {
    expect(eventMenuItems({ cancel: true, trash: true }, 'scheduled')).not.toContain('edit');
    expect(eventMenuItems({}, 'scheduled')).toEqual([]);
  });

  it('lists it greyed out with the deny reason when can.update is a code', async () => {
    const can = { update: 'IMPERSONATING', trash: true } as const;
    expect(eventMenuItems(can, 'scheduled')).toContain('edit');
    // The dropdown is only in the DOM once the menu opens, so the reason is read from the catalog.
    const { capReason } = await import('../../app/components/tasks/task-caps');
    expect(capReason(can.update)).toContain('menyamar');
    expect(capReason(true)).toBeNull();
  });

  it('points at the edit route of exactly this event', () => {
    expect(eventEditHref('ev-1')).toBe('/app/events/ev-1/edit');
    expect(eventEditHref('a b/c')).toBe('/app/events/a%20b%2Fc/edit');
  });
});

describe('editEventValues', () => {
  it('reads the stored instants back as the team-zone date and clock times', () => {
    const values = editEventValues(detail(), WIB);
    // 2026-10-21T02:00Z and 03:00Z are 09.00–10.00 on 21 Okt in WIB (UTC+7).
    expect(values).toMatchObject({
      title: 'Rapat mingguan Atlas',
      date: '2026-10-21',
      startTime: '09:00',
      endTime: '10:00',
      location: 'Ruang Rapat 1',
      kind: 'meeting',
      projectId: 'p-1',
      reminders: [1440, 30],
    });
    expect(values.participantIds).toEqual([ANA.id, BUDI.id]);
  });

  it('turns the nullable fields into the empty strings the inputs hold', () => {
    const values = editEventValues(
      detail({ locationText: null, agenda: null, meetingUrl: null, project: null }),
      WIB,
    );
    expect(values).toMatchObject({ location: '', agenda: '', meetingUrl: '', projectId: null });
  });

  it('keeps an event that runs past midnight on its start day', () => {
    const values = editEventValues(
      detail({ startsAt: '2026-10-21T16:00:00.000Z', endsAt: '2026-10-21T18:00:00.000Z' }),
      WIB,
    );
    expect(values).toMatchObject({ date: '2026-10-21', startTime: '23:00', endTime: '01:00' });
  });
});

describe('toUpdateEventBody', () => {
  const values = () => editEventValues(detail(), WIB);

  it('maps the date and the two clock times to instants of the team zone', () => {
    expect(toUpdateEventBody(values(), WIB)).toMatchObject({
      title: 'Rapat mingguan Atlas',
      startsAt: '2026-10-21T02:00:00.000Z',
      endsAt: '2026-10-21T03:00:00.000Z',
      kind: 'meeting',
      remindersMinutes: [1440, 30],
    });
  });

  it('never sends projectId or participantIds, whatever the form holds', () => {
    const body = toUpdateEventBody({ ...values(), projectId: 'p-9', participantIds: ['u-x'] }, WIB);
    expect(body).not.toBeNull();
    expect(Object.keys(body ?? {}).sort()).toEqual([
      'agenda',
      'endsAt',
      'kind',
      'locationText',
      'locationType',
      'meetingUrl',
      'remindersMinutes',
      'startsAt',
      'title',
    ]);
    expect(body).not.toHaveProperty('projectId');
    expect(body).not.toHaveProperty('participantIds');
  });

  it('sends an emptied field as null, so clearing it actually clears it', () => {
    const body = toUpdateEventBody(
      { ...values(), location: '  ', meetingUrl: ' ', agenda: '' },
      WIB,
    );
    expect(body).toMatchObject({
      locationType: null,
      locationText: null,
      meetingUrl: null,
      agenda: null,
    });
  });

  it('calls it an online event once a meeting link is there, offline with a place only', () => {
    expect(toUpdateEventBody({ ...values(), meetingUrl: 'https://x.test/a' }, WIB)).toMatchObject({
      locationType: 'online',
    });
    expect(toUpdateEventBody({ ...values(), meetingUrl: '' }, WIB)).toMatchObject({
      locationType: 'offline',
      locationText: 'Ruang Rapat 1',
    });
  });

  it('refuses a date or time that is not one, instead of sending a bad instant', () => {
    expect(toUpdateEventBody({ ...values(), date: null }, WIB)).toBeNull();
    expect(toUpdateEventBody({ ...values(), startTime: '' }, WIB)).toBeNull();
  });
});

describe('saveEventChanges', () => {
  it('patches exactly this event and answers with its id', async () => {
    const calls: Array<{ id: string; body: unknown }> = [];
    const res = await saveEventChanges('ev-1', values_ok(), WIB, async (id, body) => {
      calls.push({ id, body });
      return detail();
    });
    expect(res).toEqual({ ok: true, id: 'ev-1' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('ev-1');
  });

  it('checks the fields before any request and says what to fix', async () => {
    const update = mock(async () => detail());
    const res = await saveEventChanges('ev-1', { ...values_ok(), title: '  ' }, WIB, update);
    expect(res).toMatchObject({ ok: false, message: COPY.checkFields });
    expect(update).not.toHaveBeenCalled();
    if (!res.ok) expect(res.fields.title).toBe(COPY.titleRequired);
  });

  it('turns a refused request into an actionable sentence instead of throwing', async () => {
    const res = await saveEventChanges('ev-1', values_ok(), WIB, async () => {
      throw new Error('putus');
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message.length).toBeGreaterThan(0);
  });
});

describe('the form in edit mode', () => {
  it('reads project and guests out, hides the picker and says Simpan perubahan', async () => {
    const html = await render(
      <EventForm
        eventId="ev-1"
        initial={values_ok()}
        locked={{ projectName: 'Atlas', participants: [ANA.name, BUDI.name] }}
        projects={[]}
        timeZone={WIB}
        cancelTo="/app/events/ev-1"
      />,
    );
    expect(html).toContain(COPY.saveEdit);
    expect(html).not.toContain(COPY.save);
    expect(html).toContain(COPY.projectLocked);
    expect(html).toContain(COPY.participantsLocked);
    expect(html).toContain('Ana Pratama, Budi Santoso');
    // The guest MultiSelect and the project Select never render, so neither field can be sent.
    expect(html).not.toContain(COPY.participantsPlaceholder);
    expect(html).not.toContain(COPY.projectHint);
  });

  it('still creates, with the guest picker and Simpan event, when no event is given', async () => {
    const html = await render(
      <EventForm
        initial={values_ok()}
        projects={[{ value: 'p-1', label: 'Atlas' }]}
        timeZone={WIB}
        cancelTo="/app/events"
      />,
    );
    expect(html).toContain(COPY.save);
    expect(html).toContain(COPY.participantsHint);
    expect(html).not.toContain(COPY.participantsLocked);
  });
});

describe('the edit loader', () => {
  afterEach(() => {
    spyOn(guard, 'requireUser').mockRestore();
    spyOn(eventQuery, 'getEvent').mockRestore();
  });

  /** Signs a viewer in and answers `getEvent` with this event; then runs the loader. */
  async function load(over: Partial<EventDetail>) {
    spyOn(guard, 'requireUser').mockResolvedValue({
      user: { id: ANA.id, role: 'member' },
    } as unknown as Awaited<ReturnType<typeof guard.requireUser>>);
    spyOn(eventQuery, 'getEvent').mockResolvedValue({
      ok: true,
      event: detail(over) as never,
    });
    return loader({
      request: new Request('http://x/app/events/ev-1/edit'),
      params: { id: 'ev-1' },
      context: {},
    } as Parameters<typeof loader>[0]);
  }

  /** A `data()` refusal: its status and the reason it carries. */
  const refused = (res: unknown) => {
    const r = res as { data?: { allowed?: boolean; reason?: string }; init?: { status?: number } };
    expect(r.data?.allowed).toBe(false);
    return { status: r.init?.status, reason: r.data?.reason ?? '' };
  };

  it('opens the form with the event read back and the two locked fields', async () => {
    const res = (await load({ can: { update: true, trash: true } })) as Extract<
      Awaited<ReturnType<typeof loader>>,
      { allowed: true }
    >;
    expect(res.allowed).toBe(true);
    expect(res.id).toBe('ev-1');
    expect(res.detail).toBe('/app/events/ev-1');
    expect(res.initial).toMatchObject({ date: '2026-10-21', startTime: '09:00' });
    expect(res.locked).toEqual({
      projectName: 'Atlas',
      participants: [ANA.name, BUDI.name],
    });
  });

  it('answers 403 with a plain reason when update is missing from can{}', async () => {
    expect(refused(await load({ can: { trash: true } }))).toEqual({
      status: 403,
      reason: COPY.editForbidden,
    });
  });

  it('answers 403 with the catalog sentence when update is a deny code', async () => {
    const r = refused(await load({ can: { update: 'IMPERSONATING' } }));
    expect(r.status).toBe(403);
    expect(r.reason).toContain('menyamar');
  });

  it('answers the same friendly 404 as the detail for a hidden or missing event', async () => {
    spyOn(guard, 'requireUser').mockResolvedValue({
      user: { id: ANA.id, role: 'member' },
    } as unknown as Awaited<ReturnType<typeof guard.requireUser>>);
    spyOn(eventQuery, 'getEvent').mockResolvedValue({ ok: false, code: 'NOT_FOUND' });
    const err = await loader({
      request: new Request('http://x/app/events/ev-gone/edit'),
      params: { id: 'ev-gone' },
      context: {},
    } as Parameters<typeof loader>[0]).catch((e: unknown) => e);
    expect((err as { init?: { status?: number } }).init?.status).toBe(404);
  });
});

describe('Ubah acara in the detail copy', () => {
  it('names the action imperatively and explains what it changes', () => {
    expect(ACTION_COPY.editItem).toBe('Ubah acara');
    expect(ACTION_COPY.editHint.length).toBeGreaterThan(0);
  });
});
