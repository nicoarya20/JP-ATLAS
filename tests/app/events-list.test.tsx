/** Events list page (S7 E-09): tabs, grouping, empty states, and the create button gated by the server. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { EventLoadError } from '../../app/components/events/EventLoadError';
import { EventsView } from '../../app/components/events/EventsView';
import { ParticipantList } from '../../app/components/events/ParticipantList';
import type { EventListItem, EventPage, EventsSeed } from '../../app/lib/events-api';
import { parseEventFilters, toEventQuery } from '../../app/lib/events-filters';
import type { EventsClock } from '../../app/lib/events-format';

// 20 Oct 2026 10:00 WIB.
const CLOCK: EventsClock = {
  now: Date.parse('2026-10-20T03:00:00.000Z'), // test-only
  today: '2026-10-20',
  timeZone: 'Asia/Jakarta', // test-only
};

function item(id: string, startsAt: string, endsAt: string, over: Partial<EventListItem> = {}) {
  return {
    id,
    title: `Rapat ${id}`,
    kind: 'meeting',
    startsAt,
    endsAt,
    locationType: 'offline',
    locationText: 'Ruang Rapat 1',
    meetingUrl: null,
    project: null,
    canceledAt: null,
    cancelReason: null,
    participants: { total: 3, isParticipant: false },
    noteStatus: null,
    can: {},
    ...over,
  } satisfies EventListItem;
}

const TODAY = item('hari', '2026-10-20T04:00:00.000Z', '2026-10-20T05:00:00.000Z');
const TOMORROW = item('besok', '2026-10-21T02:00:00.000Z', '2026-10-21T03:00:00.000Z', {
  kind: 'team',
  locationType: 'online',
  locationText: null,
});

type Opts = { search?: string; items?: EventListItem[]; canCreate?: boolean; next?: string | null };

function page(opts: Opts, items: EventListItem[]): EventPage {
  return { items, nextCursor: opts.next ?? null, caps: { createEvent: opts.canCreate ?? false } };
}

function render(opts: Opts = {}, prepare?: (qc: QueryClient, seed: EventsSeed) => void) {
  const search = opts.search ?? '';
  const query = toEventQuery(parseEventFilters(new URLSearchParams(search)));
  const seed: EventsSeed = {
    query,
    first: page(opts, opts.items ?? [TODAY, TOMORROW]),
    loadedAt: CLOCK.now,
  };
  const qc = new QueryClient();
  prepare?.(qc, seed);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <MantineProvider>
        <MemoryRouter initialEntries={[`/app/events${search}`]}>
          <EventsView
            seed={seed}
            clock={CLOCK}
            canCreate={opts.canCreate ?? false}
            projects={[{ value: 'p1', label: 'Atlas' }]}
          />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('Events list — tabs and grouping', () => {
  it('shows both tabs, the list and one heading per team-zone day', () => {
    const html = render();
    expect(html).toContain('Akan datang');
    expect(html).toContain('Sudah lewat');
    expect(html).toContain('Hari ini · Selasa, 20 Oktober');
    expect(html).toContain('Besok · Rabu, 21 Oktober');
    expect(html).toContain('Rapat hari');
    expect(html).toContain('Rapat besok');
  });

  it('links every row to its detail page and names the kind and the place', () => {
    const html = render();
    expect(html).toContain('href="/app/events/hari"');
    expect(html).toContain('href="/app/events/besok"');
    expect(html).toContain('Rapat</span>'); // meeting kind badge
    expect(html).toContain('Acara tim'); // team kind badge
    expect(html).toContain('Ruang Rapat 1');
    expect(html).toContain('Online');
    expect(html).toContain('3 peserta');
  });

  it('shows Dibatalkan, Berlangsung and Selesai from the data, and nothing for a future event', () => {
    const canceled = item('batal', '2026-10-21T02:00:00.000Z', '2026-10-21T03:00:00.000Z', {
      canceledAt: '2026-10-19T00:00:00.000Z',
    });
    const ongoing = item('jalan', '2026-10-20T02:30:00.000Z', '2026-10-20T04:00:00.000Z');
    const ended = item('usai', '2026-10-19T02:00:00.000Z', '2026-10-19T03:00:00.000Z');
    const html = render({ search: '?waktu=lewat', items: [canceled, ongoing, ended] });
    expect(html).toContain('Dibatalkan');
    expect(html).toContain('Berlangsung');
    expect(html).toContain('Selesai');
    const future = render({ items: [TODAY] });
    for (const word of ['Dibatalkan', 'Berlangsung', 'Selesai']) expect(future).not.toContain(word);
  });

  it('offers "Tampilkan lebih banyak" only while the server has another page', () => {
    expect(render({ next: 'cursor-1' })).toContain('Tampilkan lebih banyak');
    expect(render({ next: null })).not.toContain('Tampilkan lebih banyak');
  });
});

describe('Events list — empty states', () => {
  it('explains an empty Akan datang and an empty Sudah lewat differently', () => {
    const upcoming = render({ items: [] });
    expect(upcoming).toContain('Belum ada event mendatang');
    expect(upcoming).not.toContain('Belum ada event yang lewat');
    const past = render({ search: '?waktu=lewat', items: [] });
    expect(past).toContain('Belum ada event yang lewat');
    expect(past).not.toContain('Belum ada event mendatang');
  });

  it('offers to create from an empty Akan datang only with the right to create', () => {
    const allowed = render({ items: [], canCreate: true });
    expect(allowed).toMatch(/href="\/app\/events\/new"[\s\S]*?Event baru[\s\S]*?Event baru/);
    expect(render({ items: [], canCreate: false })).not.toContain('Event baru');
  });

  it('says nothing matches, and offers to clear, when a search hides everything', () => {
    const html = render({ search: '?q=zzz', items: [] });
    expect(html).toContain('Tidak ada hasil yang cocok');
    expect(html).not.toContain('Belum ada event mendatang');
  });
});

describe('Events list — create button and views', () => {
  it('links "Event baru" to the form only when the server allows creating', () => {
    expect(render({ canCreate: true })).toMatch(
      /href="\/app\/events\/new"[^>]*>[\s\S]*?Event baru/,
    );
    expect(render({ canCreate: false })).not.toContain('Event baru');
    expect(render({ canCreate: false })).not.toContain('/app/events/new');
  });

  it('has no Daftar/Kalender switch while the calendar is parked', () => {
    const html = render({ canCreate: true });
    expect(html).not.toContain('Kalender');
    expect(html).not.toContain('Pilih tampilan');
    expect(html).not.toMatch(/>Daftar</);
  });
});

describe('Events list — loading and failure', () => {
  it('shows a loading placeholder when the loader could not seed this query', () => {
    const html = render({ search: '?waktu=lewat' }, (_qc, seed) => {
      seed.query = { tab: 'upcoming', limit: 30 };
    });
    expect(html).toContain('Memuat daftar event');
  });

  it('shows a clear message and a retry button when the fetch failed', () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <EventLoadError
          message="Halaman daftar tidak dikenali."
          retrying={false}
          onRetry={() => {}}
        />
      </MantineProvider>,
    );
    expect(html).toContain('Gagal memuat daftar event');
    expect(html).toContain('Halaman daftar tidak dikenali.');
    expect(html).toMatch(/<button[\s\S]*?Coba lagi/);
  });
});

describe('ParticipantList', () => {
  it('lists names only and says so when nobody is invited', () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <ParticipantList people={[{ id: 'u1', name: 'Sari Dewi' }]} />
      </MantineProvider>,
    );
    expect(html).toContain('Sari Dewi');
    const none = renderToStaticMarkup(
      <MantineProvider>
        <ParticipantList people={[]} />
      </MantineProvider>,
    );
    expect(none).toContain('Belum ada peserta');
  });
});
