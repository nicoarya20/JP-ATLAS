/** Saving the event form (S7 E-10): the request the API gets, in the team zone, and how a refusal comes back. */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import {
  type EventFormValues,
  mergeSuggestions,
  newEventValues,
  saveEvent,
} from '../../app/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '../../app/lib/event-form.copy';
import { eventHref } from '../../app/lib/events-api';

const WIB = 'Asia/Jakarta'; // test-only

const filled = (over: Partial<EventFormValues> = {}): EventFormValues => ({
  ...newEventValues('2026-10-20'), // test-only
  title: '  Rapat mingguan  ',
  date: '2026-10-21',
  startTime: '09:00',
  endTime: '10:30',
  ...over,
});

describe('Event form — saving', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Replaces `fetch` with one canned answer and records what was sent. */
  function answer(status: number, body: object) {
    const sent: { url: string; method: string; body: Record<string, unknown> }[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      sent.push({
        url: new URL(req.url).pathname,
        method: req.method,
        body: (await req.json()) as Record<string, unknown>,
      });
      return Response.json(body, { status });
    }) as unknown as typeof fetch;
    return sent;
  }

  it('posts the instants of the team zone and answers with the new event id', async () => {
    const sent = answer(201, { id: 'ev-1' });
    const res = await saveEvent(filled({ location: ' Ruang 3 ', participantIds: ['u2'] }), WIB);
    expect(res).toEqual({ ok: true, id: 'ev-1' });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.method).toBe('POST');
    expect(sent[0]?.url).toBe('/api/app/events');
    expect(sent[0]?.body).toEqual({
      title: 'Rapat mingguan',
      // 09.00 and 10.30 on 21 Oct 2026 in WIB (UTC+7).
      startsAt: '2026-10-21T02:00:00.000Z',
      endsAt: '2026-10-21T03:30:00.000Z',
      kind: 'meeting',
      remindersMinutes: [1440, 30],
      participantIds: ['u2'],
      locationType: 'offline',
      locationText: 'Ruang 3',
    });
    expect(eventHref(res.ok ? res.id : '')).toBe('/app/events/ev-1');
  });

  it('puts an early-morning start on the previous UTC day', async () => {
    const sent = answer(201, { id: 'ev-2' });
    await saveEvent(filled({ startTime: '00:30', endTime: '01:00' }), WIB);
    expect(sent[0]?.body.startsAt).toBe('2026-10-20T17:30:00.000Z');
    expect(sent[0]?.body.endsAt).toBe('2026-10-20T18:00:00.000Z');
  });

  it('sends the stage-2 choices and marks a link as an online event', async () => {
    const sent = answer(201, { id: 'ev-3' });
    await saveEvent(
      filled({
        kind: 'review',
        projectId: 'p1',
        agenda: ' Bahas laporan ',
        meetingUrl: ' https://meet.example/abc ',
        reminders: [30],
      }),
      WIB,
    );
    expect(sent[0]?.body).toMatchObject({
      kind: 'review',
      projectId: 'p1',
      agenda: 'Bahas laporan',
      meetingUrl: 'https://meet.example/abc',
      locationType: 'online',
      remindersMinutes: [30],
    });
    expect(sent[0]?.body).not.toHaveProperty('locationText');
  });

  it('does not call the API while the form is invalid', async () => {
    const sent = answer(201, { id: 'never' });
    const res = await saveEvent(filled({ endTime: '08:00' }), WIB);
    expect(res.ok).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('hands back the refusal of the server as a message and a field', async () => {
    answer(403, { error: 'Kamu belum menjadi anggota proyek ini.', code: 'NOT_MEMBER' });
    const res = await saveEvent(filled({ projectId: 'p9' }), WIB);
    expect(res).toMatchObject({ ok: false, message: COPY.notMember });
    expect(res.ok ? {} : res.fields).toEqual({ projectId: COPY.notMember });
  });

  it('suggests project people first, without repeating anyone', () => {
    const a = { id: 'a', name: 'Ayu', jobTitle: null };
    const b = { id: 'b', name: 'Budi', jobTitle: 'PM' };
    const c = { id: 'c', name: 'Citra', jobTitle: null };
    expect(mergeSuggestions([b], [a, b, c]).map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(mergeSuggestions([], [a])).toEqual([a]);
  });
});
