/** Event detail page (S7 E-11): the full read, passive Notulensi, caps-driven menu and the 404. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { createStaticHandler } from 'react-router';
import {
  cancelItemState,
  EventDetailMenu,
  eventMenuItems,
} from '../../app/components/events/EventDetailMenu';
import { ACTION_COPY, DETAIL_COPY } from '../../app/components/events/event-detail.copy';
import { describeError } from '../../app/lib/error-page';
import { loader } from '../../app/routes/app/event-detail';
import * as eventQuery from '../../server/event/events.query';
import * as guard from '../../server/guard';
import { BUDI, detail, render, view } from './event-detail.fixtures';

describe('the detail read', () => {
  it('shows title, kind, day and time in the team zone, place, link, project, agenda and creator', async () => {
    const html = await view(detail());
    expect(html).toContain('Rapat mingguan Atlas');
    expect(html).toContain('Rabu, 21 Oktober 2026');
    expect(html).toContain('09.00–10.00');
    expect(html).toContain('Ruang Rapat 1');
    expect(html).toContain(`href="https://meet.example.test/abc"`);
    expect(html).toContain(DETAIL_COPY.openLink);
    expect(html).toContain('href="/app/projects/p-1"');
    expect(html).toContain('Bahas rilis');
    expect(html).toContain('Rapat</span>'); // meeting kind badge
    expect(html).toContain(DETAIL_COPY.creator);
    expect(html).not.toContain('Dibatalkan');
  });

  it('lists every guest by name and marks only the creator', async () => {
    const html = await view(detail());
    expect(html).toContain('Ana Pratama');
    expect(html).toContain('Budi Santoso');
    expect(html.split(DETAIL_COPY.creatorMark).length - 1).toBe(1);
    expect(html).toContain('Peserta (2)');
  });

  it('replaces the minutes with one passive sentence: no Ketik, Foto, Suara or Ubah button', async () => {
    const html = await view(detail({ can: { cancel: true, trash: true, writeNote: true } }));
    expect(html).toContain('Notulensi dan rekaman rapat: segera hadir.');
    for (const word of ['Ketik', 'Foto', 'Suara', 'Simpan notulensi', 'Ubah acara']) {
      expect(html).not.toContain(word);
    }
    // The back link is an anchor, so the ⋯ menu icon is the only button on the page.
    expect(html.match(/<button/g)?.length ?? 0).toBe(1);
  });

  it('never turns a non-web meeting link into an anchor, and reads an empty event kindly', async () => {
    const html = await view(
      detail({
        meetingUrl: 'javascript:alert(1)', // test-only
        locationText: null,
        locationType: null,
        agenda: null,
        project: null,
        creator: null,
        participants: [],
      }),
    );
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain(DETAIL_COPY.openLink);
    expect(html).toContain(DETAIL_COPY.noPlace);
    expect(html).toContain(DETAIL_COPY.noAgenda);
    expect(html).toContain(DETAIL_COPY.noProject);
    expect(html).toContain(DETAIL_COPY.noCreator);
    expect(html).toContain('Belum ada peserta');
  });

  it('shows Berlangsung and Selesai from the clock, and Dibatalkan with the reason and who', async () => {
    const ongoing = await view(
      detail({ startsAt: '2026-10-20T02:30:00.000Z', endsAt: '2026-10-20T04:00:00.000Z' }),
    );
    expect(ongoing).toContain('Berlangsung');
    const ended = await view(
      detail({ startsAt: '2026-10-19T02:00:00.000Z', endsAt: '2026-10-19T03:00:00.000Z' }),
    );
    expect(ended).toContain('Selesai');
    const canceled = await view(
      detail({
        canceledAt: '2026-10-19T00:00:00.000Z',
        cancelReason: 'Narasumber sakit',
        canceledBy: BUDI,
        can: {},
      }),
    );
    expect(canceled).toContain('Dibatalkan');
    expect(canceled).toContain(DETAIL_COPY.canceledTitle);
    expect(canceled).toContain('Alasan: Narasumber sakit');
    expect(canceled).toContain('Dibatalkan oleh Budi Santoso');
  });
});

describe('the ⋯ menu follows the server can{}', () => {
  it('offers nothing to a guest or a non-manager, and renders no menu button', async () => {
    expect(eventMenuItems({}, 'scheduled')).toEqual([]);
    const event = detail({ can: {} });
    const html = await render(<EventDetailMenu event={event} status="scheduled" />);
    expect(html).not.toContain(DETAIL_COPY.menuLabel);
    expect(await view(event)).not.toContain(DETAIL_COPY.menuLabel);
  });

  it('offers Batalkan then Hapus when allowed, and renders the menu button', async () => {
    expect(eventMenuItems({ cancel: true, trash: true }, 'scheduled')).toEqual([
      'cancel',
      'delete',
    ]);
    expect(eventMenuItems({ trash: true }, 'scheduled')).toEqual(['delete']);
    const html = await render(<EventDetailMenu event={detail()} status="scheduled" />);
    expect(html).toContain(`aria-label="${DETAIL_COPY.menuLabel}"`);
  });

  it('no longer offers Batalkan once the event is canceled, whatever the server sent', () => {
    expect(eventMenuItems({ cancel: true, trash: true }, 'canceled')).toEqual(['delete']);
    expect(cancelItemState({ cancel: true }, 'canceled').shown).toBe(false);
  });

  it('greys Batalkan out with a reason for an ended event or a deny code', () => {
    const ended = cancelItemState({ cancel: true }, 'ended');
    expect(ended).toMatchObject({ shown: true, enabled: false, reason: ACTION_COPY.cancelEnded });
    const impersonating = cancelItemState({ cancel: 'IMPERSONATING' }, 'scheduled');
    expect(impersonating.enabled).toBe(false);
    expect(impersonating.reason).toContain('menyamar');
    expect(cancelItemState({ cancel: true }, 'ongoing')).toMatchObject({
      enabled: true,
      reason: null,
    });
  });
});

describe('404 (missing, in the Trash or hidden)', () => {
  afterEach(() => {
    spyOn(guard, 'requireUser').mockRestore();
    spyOn(eventQuery, 'getEvent').mockRestore();
  });

  it('answers the friendly not-found page, never a stack trace', async () => {
    spyOn(guard, 'requireUser').mockResolvedValue({
      user: { id: 'u-ana', role: 'member' },
    } as unknown as Awaited<ReturnType<typeof guard.requireUser>>);
    spyOn(eventQuery, 'getEvent').mockResolvedValue({ ok: false, code: 'NOT_FOUND' });
    const handler = createStaticHandler([
      { id: 'root', path: '/app/events/:id', loader: loader as never, Component: () => null },
    ]);
    const context = await handler.query(new Request('http://x/app/events/ev-gone'));
    if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
    expect(context.statusCode).toBe(404);
    const info = describeError(context.errors?.root, false);
    expect(info).toMatchObject({
      status: 404,
      kind: 'not-found',
      title: 'Halaman tidak ditemukan',
    });
    expect(info.detail).toBeNull();
  });
});
