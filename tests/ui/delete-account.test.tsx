/** Hapus akun dialogs: the blocked list names projects with links; the T3 form asks for the password only when needed. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import {
  BlockedList,
  DeleteAccountCard,
  DeleteForm,
} from '../../app/components/account/DeleteAccountCard';

async function render(node: ReactNode) {
  const handler = createStaticHandler([
    {
      id: 'root',
      path: '/',
      Component: () => <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>,
    },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  return renderToString(
    <MantineProvider>
      <StaticRouterProvider
        router={createStaticRouter(handler.dataRoutes, context)}
        context={context}
        hydrate={false}
      />
    </MantineProvider>,
  );
}

const noop = () => undefined;
const EMAIL = 'boss@example.test'; // test-only

describe('BlockedList', () => {
  it('lists each blocking project as a link, has no email field, and one "Mengerti" button', async () => {
    const html = await render(
      <BlockedList
        check={{
          canDelete: false,
          projects: [
            { id: 'p1', name: 'Pameran Oktober' },
            { id: 'p2', name: 'Audit Gudang' },
          ],
          total: 2,
        }}
        onClose={noop}
      />,
    );
    expect(html).toContain('href="/app/projects/p1"');
    expect(html).toContain('Pameran Oktober');
    expect(html).toContain('href="/app/projects/p2"');
    expect(html).toContain('Tunjuk pengelola lain dulu');
    expect(html).toContain('Mengerti');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('Hapus akun saya');
  });

  it('says how many more projects there are beyond the ones named', async () => {
    const html = await render(
      <BlockedList
        check={{ canDelete: false, projects: [{ id: 'p1', name: 'A' }], total: 23 }}
        onClose={noop}
      />,
    );
    expect(html).toContain('Dan 22 proyek lain.');
  });
});

describe('DeleteForm', () => {
  it('states the impact and keeps the red button disabled until the email is typed', async () => {
    const html = await render(<DeleteForm email={EMAIL} needsPassword={false} onClose={noop} />);
    expect(html).toContain('Tugas yang Anda kerjakan menjadi tanpa penanggung jawab');
    expect(html).toContain(EMAIL);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Hapus akun saya/);
    expect(html).not.toContain('type="password"');
  });

  it('asks for the password when the account has one', async () => {
    const html = await render(<DeleteForm email={EMAIL} needsPassword onClose={noop} />);
    expect(html).toContain('type="password"');
  });
});

describe('DeleteAccountCard', () => {
  it('waits for the linked accounts before it can be opened (the password question is unanswered)', async () => {
    const waiting = await render(
      <DeleteAccountCard email={EMAIL} hasPassword={false} passwordKnown={false} />,
    );
    expect(waiting).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Hapus akun saya/);
    const ready = await render(<DeleteAccountCard email={EMAIL} hasPassword={false} />);
    expect(ready).not.toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Hapus akun saya/);
  });
});
