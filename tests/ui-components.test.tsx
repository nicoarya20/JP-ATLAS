import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MantineProvider } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { METRICS } from '@server/metrics/config';
import type { ReactElement, ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { FiInbox } from 'react-icons/fi';
import {
  createStaticHandler,
  createStaticRouter,
  MemoryRouter,
  StaticRouterProvider,
} from 'react-router';
import { confirmAction } from '../app/components/ui/confirmAction';
import { DateText, describeDue, formatCalendarDate } from '../app/components/ui/DateText';
import { EmptyState } from '../app/components/ui/EmptyState';
import { ERROR_SECONDS, notify, SUCCESS_SECONDS } from '../app/components/ui/notify';
import { PAGE_WIDTHS, PageContainer } from '../app/components/ui/PageContainer';
import { PageHeader } from '../app/components/ui/PageHeader';
import type { RenderClock } from '../app/lib/time-format';

const ROOT = path.join(import.meta.dir, '..');
const render = (node: ReactNode) =>
  renderToString(
    <MantineProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </MantineProvider>,
  );

/** Renders under a data router whose root loader supplies the clock, like the real app. */
async function renderWithClock(clock: RenderClock, node: ReactNode) {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}

describe('EmptyState', () => {
  it('shows the title, the description and an icon', () => {
    const html = render(
      <EmptyState icon={FiInbox} title="Belum ada tugas" description="Buat tugas pertama." />,
    );
    expect(html).toContain('Belum ada tugas');
    expect(html).toContain('Buat tugas pertama.');
    expect(html).toContain('<svg');
  });

  it('offers the action as a link when it has a target', () => {
    const html = render(
      <EmptyState
        icon={FiInbox}
        title="Kosong"
        action={{ label: 'Buat tugas', to: '/app/tasks/new' }}
      />,
    );
    expect(html).toContain('href="/app/tasks/new"');
    expect(html).toContain('Buat tugas');
  });

  it('tells a filtered list apart from an empty one and offers a reset', () => {
    const html = render(
      <EmptyState icon={FiInbox} title="Belum ada tugas" filtered onReset={() => {}} />,
    );
    expect(html).toContain('Tidak ada hasil yang cocok');
    expect(html).toContain('Reset filter');
    expect(html).not.toContain('Belum ada tugas');
  });
});

describe('PageHeader and PageContainer', () => {
  it('lets the title row wrap and renders title, description, actions and back link', () => {
    const html = render(
      <PageHeader
        title="Semua tugas"
        description="Daftar tugas Anda"
        actions={<button type="button">Tambah</button>}
        back={{ to: '/app', label: 'Kembali ke Beranda' }}
      />,
    );
    expect(html).toContain('wrap');
    expect(html).not.toContain('nowrap');
    expect(html).toContain('Semua tugas');
    expect(html).toContain('Daftar tugas Anda');
    expect(html).toContain('Tambah');
    expect(html).toContain('href="/app"');
    expect(html).toContain('Kembali ke Beranda');
  });

  it('caps the column at the wide or narrow width', () => {
    expect(render(<PageContainer>x</PageContainer>)).toContain(`${PAGE_WIDTHS.wide / 16}rem`);
    expect(render(<PageContainer size="narrow">x</PageContainer>)).toContain(
      `${PAGE_WIDTHS.narrow / 16}rem`,
    );
  });

  it('no ui component sets wrap="nowrap"', () => {
    const src = readFileSync(path.join(ROOT, 'app/components/ui/PageHeader.tsx'), 'utf8');
    expect(src).not.toMatch(/wrap=["{']+nowrap/);
  });
});

describe('DateText', () => {
  // 18:00 UTC on the 15th is already 01:00 on the 16th in Asia/Jakarta, the team's "today".
  const clock: RenderClock = { now: Date.parse('2026-10-15T18:00:00.000Z'), timeZone: 'UTC' };

  it('marks a due date of today as "hari ini" using the team-zone day', async () => {
    const html = await renderWithClock(clock, <DateText mode="due" value="2026-10-16" />);
    expect(html).toContain('16 Okt 2026 · hari ini');
    expect(html).not.toContain('terlambat');
  });

  it('flags a past due date as late in words, not only colour', async () => {
    const html = await renderWithClock(clock, <DateText mode="due" value="2026-10-14" />);
    expect(html).toContain('terlambat 2 hari');
  });

  it('prints calendar, instant and relative modes from the root clock', async () => {
    const at = '2026-10-15T15:00:00.000Z';
    expect(await renderWithClock(clock, <DateText mode="date" value="2026-10-31" />)).toContain(
      '31 Okt 2026',
    );
    expect(await renderWithClock(clock, <DateText mode="relative" value={at} />)).toContain(
      '3 jam yang lalu',
    );
    expect(await renderWithClock(clock, <DateText mode="datetime" value={at} />)).toContain(
      '15.00.00',
    );
  });

  it('describeDue words today, tomorrow, later and late', () => {
    const today = '2026-10-16';
    expect(describeDue('2026-10-17', today)).toEqual({ text: '17 Okt 2026 · besok', late: false });
    expect(describeDue('2026-10-20', today).text).toContain('4 hari lagi');
    expect(describeDue('2026-10-15', today)).toEqual({
      text: '15 Okt 2026 · terlambat 1 hari',
      late: true,
    });
    expect(describeDue('bukan-tanggal', today)).toEqual({ text: '—', late: false });
    expect(formatCalendarDate('2026-10-15T18:00:00.000Z')).toBe('16 Okt 2026');
  });
});

describe('confirmAction', () => {
  afterEach(() => mock.restore());

  it('wraps openConfirmModal with the Batal label and passes the confirm callback through', () => {
    const open = spyOn(modals, 'openConfirmModal').mockImplementation(() => 'id');
    const onConfirm = mock(() => {});
    confirmAction({
      title: 'Hapus tugas?',
      body: 'Bisa dipulihkan dari Sampah.',
      confirmLabel: 'Hapus tugas',
      danger: true,
      onConfirm,
    });
    const arg = open.mock.calls[0][0];
    expect(arg.title).toBe('Hapus tugas?');
    expect(arg.labels).toEqual({ confirm: 'Hapus tugas', cancel: 'Batal' });
    expect(arg.confirmProps).toEqual({ color: 'danger' });
    arg.onConfirm?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('leaves the confirm button neutral when not dangerous', () => {
    const open = spyOn(modals, 'openConfirmModal').mockImplementation(() => 'id');
    confirmAction({
      title: 'Keluar?',
      body: 'Anda akan keluar.',
      confirmLabel: 'Keluar',
      onConfirm: () => {},
    });
    expect(open.mock.calls[0][0].confirmProps).toBeUndefined();
  });
});

describe('notify', () => {
  afterEach(() => mock.restore());

  it('keeps success for 5 s and errors for 8 s', () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    notify.success('Tersimpan.');
    notify.error('Gagal menyimpan', 'Coba lagi.');
    expect(show.mock.calls[0][0]).toMatchObject({
      message: 'Tersimpan.',
      autoClose: SUCCESS_SECONDS * 1000,
    });
    expect(show.mock.calls[1][0]).toMatchObject({
      title: 'Gagal menyimpan',
      message: 'Coba lagi.',
      autoClose: ERROR_SECONDS * 1000,
    });
    expect([SUCCESS_SECONDS, ERROR_SECONDS]).toEqual([5, 8]);
  });

  it('undo stays for the metrics undo window and hides itself when pressed', () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    const hide = spyOn(notifications, 'hide').mockImplementation(() => 'id');
    const onUndo = mock(() => {});
    notify.undo('Tugas dipindah ke Sampah.', onUndo);
    const arg = show.mock.calls[0][0];
    expect(arg.autoClose).toBe(METRICS.UNDO_WINDOW_SECONDS * 1000);
    const group = arg.message as ReactElement<{
      children: ReactElement<{ onClick: () => void }>[];
    }>;
    group.props.children[1].props.onClick();
    expect(hide).toHaveBeenCalledWith(arg.id);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
