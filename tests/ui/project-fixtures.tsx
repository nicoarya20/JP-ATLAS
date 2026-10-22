/** Shared render + data helpers for the project list view tests (list, grid, gantt). */
import { MantineProvider } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';

export const TODAY = '2026-10-07'; // test-only
const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only

/** Renders under a data router whose root loader supplies the clock, like the real app (DateText needs it). */
export async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}

export const item = (over: Partial<ProjectListItem> = {}): ProjectListItem => ({
  id: 'p-1',
  name: 'Renovasi Dapur',
  status: 'active',
  priority: 'medium',
  lead: { id: 'u-1', name: 'Dodi' },
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  progress: { done: 1, total: 6, percent: 17 },
  condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  myRole: 'manager',
  ...over,
});

export type Anchor = { href: string; className: string; text: string };

/** Every `<a>` of the markup with its href, class and visible text (tags stripped), so tests stay short. */
export function anchors(html: string): Anchor[] {
  const out: Anchor[] = [];
  for (const m of html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attrs = m[1] ?? '';
    out.push({
      href: /href="([^"]*)"/.exec(attrs)?.[1] ?? '',
      className: /class="([^"]*)"/.exec(attrs)?.[1] ?? '',
      text: (m[2] ?? '').replace(/<[^>]*>/g, '').trim(),
    });
  }
  return out;
}
