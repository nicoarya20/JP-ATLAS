/** Static render of a component under the providers the task UI needs (query client, theme, router clock). */
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';

const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only

export async function renderUi(node: ReactNode): Promise<string> {
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
