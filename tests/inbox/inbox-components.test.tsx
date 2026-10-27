/** Inbox markup: a card per kind, tabs, empty and error states, the bell and the page body. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { InboxCard } from '../../app/components/inbox/InboxCard';
import { InboxEmpty } from '../../app/components/inbox/InboxEmpty';
import { InboxList } from '../../app/components/inbox/InboxList';
import { InboxLoadError } from '../../app/components/inbox/InboxLoadError';
import { InboxTabs } from '../../app/components/inbox/InboxTabs';
import { InboxView } from '../../app/components/inbox/InboxView';
import { MarkAllReadButton } from '../../app/components/inbox/MarkAllReadButton';
import { bellLabel, NotificationBell } from '../../app/components/inbox/NotificationBell';
import type { InboxItem, InboxLane, InboxSeed } from '../../app/lib/inbox-api';
import {
  cardButton,
  cardSentence,
  NOTIFICATION_KIND_LIST,
} from '../../server/notification/notification.catalog';
import { anchors } from '../ui/project-fixtures';
import {
  CLOCK,
  eventCard,
  leaveRecordedCard,
  legacyLeaveCard,
  NOW,
  taskCard,
} from './inbox-fixtures';

/** Renders under a data router at `url`, like the real app (links need it, the tab reads `?tab=`). */
async function renderAt(url: string, node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
    { id: 'inbox', path: '/app/inbox', Component: () => node },
  ]);
  const context = await handler.query(new Request(`http://x${url}`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}
const render = (node: ReactNode) => renderAt('/', node);

const noop = () => {};
const card = (item: InboxItem) => render(<InboxCard item={item} clock={CLOCK} onOpen={noop} />);
const buttons = (html: string) =>
  [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    (m[1] ?? '').replace(/<[^>]*>/g, '').trim(),
  );

describe('InboxCard: a work-queue task card', () => {
  it('shows the sentence, the task, the project with the time and one link button to the task', async () => {
    const html = await card(taskCard());
    expect(html).toContain('Nico menunjuk Anda mengerjakan #14');
    expect(html).toContain('#14 Tulis spesifikasi API');
    expect(html).toContain('Proyek Atlas · 20 menit lalu');
    const links = anchors(html);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ href: '/app/tasks/14', text: 'Lihat tugas' });
  });

  it('marks an unread card with a dot that is spoken, and a read card without one', async () => {
    expect(await card(taskCard())).toContain('aria-label="Belum dibaca"');
    expect(await card(taskCard({ read: true }))).not.toContain('Belum dibaca');
  });

  it('shows a card of the system (no actor) with a bell avatar instead of failing', async () => {
    const html = await card(taskCard({ actor: null, sentence: 'Anda ditunjuk mengerjakan #14' }));
    expect(html).toContain('Anda ditunjuk mengerjakan #14');
    expect(anchors(html)).toHaveLength(1);
  });

  it('gives a news card the quiet (default) button and a work card the filled one', async () => {
    expect(await card(taskCard())).toContain('data-variant="filled"');
    const news = await card(eventCard());
    expect(news).toContain('data-variant="default"');
    expect(news).not.toContain('data-variant="filled"');
  });
});

describe('InboxCard: the recorded leave card (P14 D5)', () => {
  it('says what an Admin did, names the range and links once to Ketersediaan', async () => {
    const html = await card(leaveRecordedCard());
    expect(html).toContain('Cuti Anda dicatat oleh Ayu');
    expect(html).toContain('14–16 Okt 2026 · 3 hari');
    expect(anchors(html).map((a) => [a.href, a.text])).toEqual([
      ['/app/settings', 'Lihat ketersediaan'],
    ]);
    // The only button is that link: nothing is decided from the Inbox any more.
    expect(buttons(html)).toEqual([]);
  });

  it('reads the same when an Admin ended the leave', async () => {
    const html = await card(
      leaveRecordedCard({
        sentence: 'Cuti Anda diakhiri oleh Ayu',
        payload: { startDate: '2026-10-14', endDate: '2026-10-16', days: 3, change: 'cleared' },
      }),
    );
    expect(html).toContain('Cuti Anda diakhiri oleh Ayu');
    expect(anchors(html)).toHaveLength(1);
  });
});

/** P14 §8 R3: an old approval row still in the table is a readable news card, not a broken one. */
describe('InboxCard: rows of the retired approval flow', () => {
  it('renders an old request row with its heading and range, and no button at all', async () => {
    const html = await card(legacyLeaveCard());
    expect(html).toContain('Ada kabar baru untuk Anda');
    expect(html).toContain('14–16 Okt 2026 · 3 hari');
    expect(html).not.toContain('Setujui');
    expect(html).not.toContain('Tolak');
    expect(buttons(html)).toEqual([]);
    expect(anchors(html)).toEqual([]);
  });

  it('renders an old decision row the same way', async () => {
    const html = await card(legacyLeaveCard({ kind: 'leave_decided', lane: 'info' }));
    expect(html).toContain('Ada kabar baru untuk Anda');
    expect(buttons(html)).toEqual([]);
    expect(anchors(html)).toEqual([]);
  });
});

describe('InboxCard: kinds', () => {
  it('a kind this build does not know reads as news and has no dead button', async () => {
    const html = await card(taskCard({ kind: 'from_the_future', sentence: null, button: null }));
    expect(html).toContain('Ada kabar baru untuk Anda');
    expect(buttons(html)).toEqual([]);
    expect(anchors(html)).toEqual([]);
  });

  // Every kind has exactly one button, and it is a link: the two-button path left in P14 CU-06.
  it.each([...NOTIFICATION_KIND_LIST])(
    '%s renders its catalog sentence and exactly one link button',
    async (kind) => {
      const item = taskCard({
        kind,
        sentence: cardSentence(kind, {
          actor: 'Nico',
          number: 14,
          title: 'Judul',
          project: 'Atlas',
          name: 'Dodi',
          outcome: 'dicatat',
        }),
        button: cardButton(kind),
        href: '/app/somewhere',
      });
      const html = await card(item);
      expect(html).toContain(item.sentence ?? '');
      expect(buttons(html)).toEqual([]);
      expect(anchors(html).map((a) => [a.href, a.text])).toEqual([
        ['/app/somewhere', cardButton(kind)],
      ]);
    },
  );
});

describe('InboxTabs, MarkAllReadButton, InboxEmpty, InboxLoadError', () => {
  it('writes the open-card count on the first tab only', async () => {
    const html = await render(<InboxTabs lane="action" actionCount={4} onChange={noop} />);
    expect(html).toContain('Perlu Anda tanggapi (4)');
    expect(html).toContain('Kabar terbaru');
  });

  it('"Tandai semua dibaca" is disabled (with a reason on hover) when nothing is unread', async () => {
    const none = await render(<MarkAllReadButton unread={0} loading={false} onClick={noop} />);
    expect(none).toContain('Tandai semua dibaca');
    expect(none).toContain('data-disabled="true"');
    const some = await render(<MarkAllReadButton unread={3} loading onClick={noop} />);
    expect(some).not.toContain('data-disabled="true"');
    expect(some).toContain('data-loading="true"');
  });

  it('the empty work queue says "Semua beres" and offers the news', async () => {
    const html = await render(<InboxEmpty lane="action" onShowNews={noop} />);
    expect(html).toContain('Semua beres');
    expect(html).toContain('Tidak ada yang perlu Anda tanggapi saat ini.');
    expect(buttons(html)).toEqual(['Lihat Kabar terbaru']);
  });

  it('the empty news lane says so and offers no button', async () => {
    const html = await render(<InboxEmpty lane="info" onShowNews={noop} />);
    expect(html).toContain('Belum ada kabar');
    expect(buttons(html)).toEqual([]);
  });

  it('a failed load says what happened and offers "Muat ulang"', async () => {
    const html = await render(
      <InboxLoadError message="Tidak bisa terhubung ke server." retrying={false} onRetry={noop} />,
    );
    expect(html).toContain('Inbox belum bisa dimuat');
    expect(html).toContain('Tidak bisa terhubung ke server.');
    expect(buttons(html)).toEqual(['Muat ulang']);
  });
});

describe('NotificationBell', () => {
  it('links to the Inbox with the number in its accessible name', async () => {
    const html = await render(<NotificationBell count={4} />);
    expect(anchors(html)[0]?.href).toBe('/app/inbox');
    expect(html).toContain('aria-label="Inbox, 4 hal perlu Anda tanggapi"');
    expect(html).toContain('>4<');
  });

  it('shows no number at zero and caps a long queue at 99+', async () => {
    const none = await render(<NotificationBell count={0} />);
    expect(none).toContain('aria-label="Inbox"');
    expect(none).not.toContain('mantine-Indicator-indicator');
    expect(bellLabel(0)).toBeNull();
    expect(bellLabel(99)).toBe('99');
    expect(bellLabel(100)).toBe('99+');
  });
});

const page = (items: InboxItem[], nextCursor: string | null = null) => ({ items, nextCursor });
const seedOf = (action: ReturnType<typeof page> | null, info: ReturnType<typeof page> | null) =>
  ({
    first: { action, info },
    counts: { action: action?.items.length ?? 0, infoUnread: 2 },
    loadedAt: NOW,
  }) satisfies InboxSeed;

const list = (lane: InboxLane, seed: InboxSeed) =>
  render(<InboxList lane={lane} seed={seed} clock={CLOCK} onOpen={noop} onShowNews={noop} />);

describe('InboxList (seeded by the loader)', () => {
  it('shows the news lane by day with its headings', async () => {
    const info = page([
      eventCard({ id: 'a', group: 'today' }),
      eventCard({ id: 'b', group: 'yesterday', sentence: 'Dewi mengundang Anda' }),
    ]);
    const html = await list('info', seedOf(null, info));
    expect(html).toContain('Hari ini');
    expect(html).toContain('Kemarin');
    expect(html.indexOf('Hari ini')).toBeLessThan(html.indexOf('Kemarin'));
  });

  it('shows the work queue as one list without day headings', async () => {
    const html = await list('action', seedOf(page([taskCard()]), null));
    expect(html).toContain('Nico menunjuk Anda mengerjakan #14');
    expect(html).not.toContain('Hari ini');
    expect(html).not.toContain('Muat lebih banyak');
  });

  it('offers "Muat lebih banyak" only while the server has another page', async () => {
    const more = await list('action', seedOf(page([taskCard()], 'cursor-1'), null));
    expect(more).toContain('Muat lebih banyak');
  });

  it('shows the empty state of the lane when it has no cards', async () => {
    expect(await list('action', seedOf(page([]), null))).toContain('Semua beres');
    expect(await list('info', seedOf(null, page([])))).toContain('Belum ada kabar');
  });

  it('shows a loading placeholder, not a blank, when the loader could not read the lane', async () => {
    const html = await list('action', seedOf(null, null));
    expect(html).toContain('aria-label="Memuat Inbox"');
  });
});

describe('InboxView (the page body)', () => {
  const seed = seedOf(page([taskCard()]), page([eventCard(), leaveRecordedCard()]));
  const view = (url: string) =>
    renderAt(
      url,
      <InboxView
        seed={{ ...seed, counts: { action: 4, infoUnread: 2 } }}
        timeZone={CLOCK.timeZone}
      />,
    );

  it('opens on "Perlu Anda tanggapi" with the bell count in the tab and no "Tandai semua dibaca"', async () => {
    const html = await view('/app/inbox');
    expect(html).toContain('Inbox');
    expect(html).toContain('Semua kabar dan permintaan untuk Anda');
    expect(html).toContain('Perlu Anda tanggapi (4)');
    expect(html).toContain('Nico menunjuk Anda mengerjakan #14');
    expect(html).not.toContain('Cuti Anda dicatat oleh Ayu');
    expect(html).not.toContain('Tandai semua dibaca');
  });

  it('?tab=info opens the news with "Tandai semua dibaca"', async () => {
    const html = await view('/app/inbox?tab=info');
    expect(html).toContain('Tandai semua dibaca');
    expect(html).toContain('Nico mengundang Anda');
    expect(html).toContain('Cuti Anda dicatat oleh Ayu');
    expect(html).not.toContain('Nico menunjuk Anda mengerjakan #14');
  });
});
