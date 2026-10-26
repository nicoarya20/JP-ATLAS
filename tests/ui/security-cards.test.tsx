/** Keamanan dan perangkat cards: loading, error and empty states stay apart, and only other devices get a revoke button. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { CreatePasswordCard } from '../../app/components/profile/CreatePasswordCard';
import { LinkedAccountsCard } from '../../app/components/profile/LinkedAccountsCard';
import { PasswordCard } from '../../app/components/profile/PasswordCard';
import { SessionsCard } from '../../app/components/profile/SessionsCard';
import type { DeviceSession } from '../../app/lib/profile-api';

/** The cards read the root clock, so they render under a data router (same as settings-page.test). */
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

const session = (id: string, token: string): DeviceSession => ({
  id,
  token,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-20T08:00:00Z',
  expiresAt: '2026-11-01T08:00:00Z',
  ipAddress: '203.0.113.7', // test-only
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15',
});
const noop = () => undefined;
const count = (html: string, text: string) => html.split(text).length - 1;

describe('SessionsCard', () => {
  const base = { currentToken: 'tok-a', loading: false, onChanged: noop };

  it('marks this device and offers "Keluarkan perangkat ini" only for the others', async () => {
    const html = await render(
      <SessionsCard {...base} sessions={[session('1', 'tok-a'), session('2', 'tok-b')]} />,
    );
    expect(count(html, 'Perangkat ini<')).toBe(1);
    expect(count(html, 'Keluarkan perangkat ini<')).toBe(1);
    expect(html).toContain('Keluarkan 1 perangkat lain');
  });

  it('offers no revoke button when this is the only device', async () => {
    const html = await render(<SessionsCard {...base} sessions={[session('1', 'tok-a')]} />);
    expect(html).not.toContain('Keluarkan perangkat ini<');
    expect(html).not.toContain('perangkat lain');
  });

  it('says "Memuat…" while loading and "Tidak ada sesi aktif." only when truly empty', async () => {
    const loading = await render(<SessionsCard {...base} loading sessions={[]} />);
    expect(loading).toContain('Memuat…');
    expect(loading).not.toContain('Tidak ada sesi aktif.');
    expect(await render(<SessionsCard {...base} sessions={[]} />)).toContain(
      'Tidak ada sesi aktif.',
    );
  });

  it('shows the failure with a retry button instead of a misleading empty list', async () => {
    const html = await render(
      <SessionsCard {...base} sessions={[]} error="Gagal memuat sesi" onRetry={noop} />,
    );
    expect(html).toContain('Gagal memuat perangkat');
    expect(html).toContain('Gagal memuat sesi');
    expect(html).toContain('Coba lagi');
    expect(html).not.toContain('Tidak ada sesi aktif.');
  });
});

describe('PasswordCard', () => {
  it('offers neither form while linked accounts are loading, so it claims nothing yet', async () => {
    const html = await render(<PasswordCard hasPassword={false} loading onChanged={noop} />);
    expect(html).toContain('Memuat…');
    expect(html).not.toContain('belum punya password');
    expect(html).not.toContain('Password baru');
  });

  it('offers "Buat password" when there is none, and the change form once there is', async () => {
    const create = await render(<PasswordCard hasPassword={false} onChanged={noop} />);
    expect(create).toContain('belum punya password');
    expect(create).toContain('Buat password');
    expect(create).toContain('Password baru');
    expect(create).toContain('Ulangi password baru');
    // The dead end is gone: nothing sends the owner to an admin who has no way to help (SET).
    expect(create).not.toContain('hubungi admin');
    expect(create).not.toContain('Password saat ini');

    const change = await render(<PasswordCard hasPassword onChanged={noop} />);
    expect(change).toContain('Password saat ini');
    expect(change).toContain('Ganti password');
    expect(change).not.toContain('Buat password');
  });
});

describe('CreatePasswordCard', () => {
  it('says why the account has no password and what the new one unlocks', async () => {
    const html = await render(<CreatePasswordCard onCreated={noop} />);
    expect(html).toContain('masuk lewat Google dan belum punya password');
    expect(html).toContain('aplikasi mobile');
    expect(html).toContain('Minimal 8 karakter');
  });

  it('warns that the other devices are signed out, and that Google keeps working', async () => {
    const html = await render(<CreatePasswordCard onCreated={noop} />);
    expect(html).toContain('Perangkat lain akan');
    expect(html).toContain('perangkat ini tetap masuk');
    expect(html).toContain('Masuk dengan Google tetap bisa dipakai');
  });

  it('keeps the button disabled until both fields are filled', async () => {
    const html = await render(<CreatePasswordCard onCreated={noop} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Buat password/);
  });
});

describe('LinkedAccountsCard', () => {
  it('shows the load failure with a retry button', async () => {
    const html = await render(
      <LinkedAccountsCard
        accounts={[]}
        googleEnabled={false}
        loading={false}
        error="Gagal memuat akun tertaut"
        onRetry={noop}
        onChanged={noop}
      />,
    );
    expect(html).toContain('Gagal memuat cara masuk');
    expect(html).toContain('Gagal memuat akun tertaut');
    expect(html).toContain('Coba lagi');
  });

  it('disables "Lepas" when the only sign-in method would be removed', async () => {
    const html = await render(
      <LinkedAccountsCard
        accounts={[{ id: 'a1', providerId: 'credential' }]}
        googleEnabled={false}
        loading={false}
        onChanged={noop}
      />,
    );
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Lepas/);
  });
});
