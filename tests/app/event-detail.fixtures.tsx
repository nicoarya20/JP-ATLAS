/** Shared fixtures of the event detail tests (S7 E-11): the clock, a full detail and a static renderer. */
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { EventDetailView } from '../../app/components/events/EventDetailView';
import type { EventDetail } from '../../app/lib/events-api';
import type { EventsClock } from '../../app/lib/events-format';

// 20 Oct 2026 10:00 WIB.
export const CLOCK: EventsClock = {
  now: Date.parse('2026-10-20T03:00:00.000Z'), // test-only
  today: '2026-10-20',
  timeZone: 'Asia/Jakarta', // test-only
};

export const ANA = { id: 'u-ana', name: 'Ana Pratama' }; // test-only
export const BUDI = { id: 'u-budi', name: 'Budi Santoso' }; // test-only

export function detail(over: Partial<EventDetail> = {}): EventDetail {
  return {
    id: 'ev-1',
    title: 'Rapat mingguan Atlas',
    kind: 'meeting',
    startsAt: '2026-10-21T02:00:00.000Z', // 21 Okt 09.00 WIB
    endsAt: '2026-10-21T03:00:00.000Z',
    locationType: 'offline',
    locationText: 'Ruang Rapat 1',
    meetingUrl: 'https://meet.example.test/abc', // test-only
    project: { id: 'p-1', name: 'Atlas', status: 'active' },
    canceledAt: null,
    cancelReason: null,
    canceledBy: null,
    agenda: 'Bahas rilis\nBahas anggaran',
    remindersMinutes: [1440, 30],
    creator: ANA,
    participants: [ANA, BUDI],
    noteStatus: null,
    note: null,
    createdAt: '2026-10-18T02:00:00.000Z',
    updatedAt: '2026-10-18T02:00:00.000Z',
    can: { cancel: true, trash: true, update: true },
    ...over,
  };
}

export async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
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

export const view = (e: EventDetail) => render(<EventDetailView event={e} clock={CLOCK} />);
