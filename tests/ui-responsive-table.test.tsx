import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { modals } from '@mantine/modals';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { FiColumns, FiInbox, FiList } from 'react-icons/fi';
import { MemoryRouter } from 'react-router';
import { BackLink, hasInternalHistory } from '../app/components/ui/BackLink';
import { EmptyState } from '../app/components/ui/EmptyState';
import { FILTER_LABEL, FilterPopover } from '../app/components/ui/FilterPopover';
import {
  openReasonModal,
  REASON_MAX_LENGTH,
  ReasonForm,
  validateReason,
} from '../app/components/ui/ReasonModal';
import { ResponsiveTable } from '../app/components/ui/ResponsiveTable';
import { ViewToggle } from '../app/components/ui/ViewToggle';

const render = (node: ReactNode) =>
  renderToString(
    <MantineProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </MantineProvider>,
  );

type Row = { id: string; name: string; owner: string; due: string };
const ROWS: Row[] = [
  { id: 'p1', name: 'Redesain situs', owner: 'Sari', due: '12 Nov' },
  { id: 'p2', name: 'Audit keuangan', owner: 'Budi', due: '30 Nov' },
];
const COLUMNS = [
  { key: 'name', header: 'Nama', cell: (r: Row) => r.name },
  { key: 'owner', header: 'Penanggung jawab', cell: (r: Row) => r.owner, hideBelow: 'lg' as const },
  { key: 'due', header: 'Tenggat', cell: (r: Row) => r.due },
];
const table = (rows: Row[]) =>
  render(
    <ResponsiveTable
      label="Daftar proyek"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(r) => r.id}
      renderCard={(r) => <span data-card={r.id}>Kartu {r.name}</span>}
      empty={<EmptyState icon={FiInbox} title="Belum ada proyek" />}
    />,
  );

describe('ResponsiveTable', () => {
  it('renders the desktop table and the mobile card list in the same markup', () => {
    const html = table(ROWS);
    expect(html).toContain('<table');
    expect(html).toContain('aria-label="Daftar proyek"');
    expect(html).toContain('data-card="p1"');
    expect(html).toContain('data-card="p2"');
    for (const r of ROWS) expect(html).toContain(r.name);
  });

  it('puts the table behind visibleFrom="sm" in a horizontal scroller and the cards behind hiddenFrom="sm"', () => {
    const html = table(ROWS);
    const tableAt = html.indexOf('<table');
    const wrapper = html.slice(html.lastIndexOf('<div', tableAt), tableAt);
    expect(wrapper).toContain('mantine-visible-from-sm');
    expect(wrapper).toContain('overflow-x:auto');
    const cardAt = html.indexOf('data-card="p1"');
    const cards = html.slice(
      html.lastIndexOf('<div', html.lastIndexOf('<div', cardAt) - 1),
      cardAt,
    );
    expect(cards).toContain('mantine-hidden-from-sm');
  });

  it('hides a column below its breakpoint on header and cells alike', () => {
    const html = table(ROWS);
    // 1 header + 2 body cells for the "owner" column.
    expect(html.match(/<t[hd][^>]*mantine-visible-from-lg/g)).toHaveLength(3);
  });

  it('shows only the empty state, without a table or cards, when there are no rows', () => {
    const html = table([]);
    expect(html).toContain('Belum ada proyek');
    expect(html).not.toContain('<table');
    // The shared <style> block always names these classes; look at class attributes only.
    expect(html).not.toMatch(/class="[^"]*mantine-hidden-from-sm/);
  });
});

describe('ViewToggle', () => {
  it('shows a text label and an icon for every option and marks the selected one', () => {
    const html = render(
      <ViewToggle
        value="list"
        onChange={() => {}}
        ariaLabel="Pilih tampilan tugas"
        options={[
          { value: 'list', label: 'Daftar', icon: FiList },
          { value: 'board', label: 'Papan', icon: FiColumns },
        ]}
      />,
    );
    expect(html).toContain('Daftar');
    expect(html).toContain('Papan');
    expect(html).toContain('aria-label="Pilih tampilan tugas"');
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="list"/);
  });
});

describe('FilterPopover', () => {
  const popover = (n: number) =>
    render(
      <FilterPopover activeCount={n} onReset={() => {}}>
        <p>isian</p>
      </FilterPopover>,
    );

  it('shows a plain "Filter" button without active filters', () => {
    const html = popover(0);
    expect(html).toContain(`>${FILTER_LABEL}<`);
    expect(html).not.toContain('(0)');
  });

  it('shows how many filters are active', () => {
    expect(popover(2)).toContain('Filter (2)');
  });
});

describe('BackLink', () => {
  it('renders a real link to the fallback so it works before hydration and in a new tab', () => {
    const html = render(<BackLink fallback="/app/tugas" label="Kembali ke daftar tugas" />);
    expect(html).toContain('href="/app/tugas"');
    expect(html).toContain('Kembali ke daftar tugas');
  });

  it('goes back only when React Router recorded an earlier in-app entry', () => {
    expect(hasInternalHistory({ idx: 2 })).toBe(true);
    expect(hasInternalHistory({ idx: 0 })).toBe(false);
    expect(hasInternalHistory(null)).toBe(false);
    expect(hasInternalHistory({})).toBe(false);
    expect(hasInternalHistory({ idx: '3' })).toBe(false);
  });
});

describe('validateReason', () => {
  const cats = [
    { value: 'dupe', label: 'Tugas dobel' },
    { value: 'other', label: 'Lainnya', requireNote: true },
  ];

  it('accepts an empty note when nothing demands one', () => {
    expect(validateReason({ category: null, reason: '' }, {})).toBeNull();
  });

  it('requires the note when requireNote is set', () => {
    expect(validateReason({ category: null, reason: '  ' }, { requireNote: true })).toContain(
      'Tulis',
    );
    expect(validateReason({ category: null, reason: 'ok' }, { requireNote: true })).toBeNull();
  });

  it('requires a category when categories are offered', () => {
    expect(validateReason({ category: null, reason: '' }, { categories: cats })).toBe(
      'Pilih salah satu alasan.',
    );
    expect(validateReason({ category: 'dupe', reason: '' }, { categories: cats })).toBeNull();
  });

  it('requires a note only for the category that asks for it ("Lainnya")', () => {
    const msg = validateReason({ category: 'other', reason: '' }, { categories: cats });
    expect(msg).toContain('Lainnya');
    expect(
      validateReason({ category: 'other', reason: 'Klien batal' }, { categories: cats }),
    ).toBeNull();
  });
});

describe('ReasonModal', () => {
  const spies: Array<{ mockRestore: () => void }> = [];
  afterEach(() => {
    for (const s of spies.splice(0)) s.mockRestore();
  });

  it('renders categories, quick phrases, a note limit and verb buttons', () => {
    const html = render(
      <ReasonForm
        title="Batalkan tugas"
        description="Tugas ini tidak akan dikerjakan lagi."
        categories={[
          { value: 'dupe', label: 'Tugas dobel' },
          { value: 'other', label: 'Lainnya', requireNote: true },
        ]}
        quick={['Tidak jadi dikerjakan']}
        confirmLabel="Batalkan tugas"
        danger
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toContain('Tugas ini tidak akan dikerjakan lagi.');
    expect(html).toContain('Tugas dobel');
    expect(html).toContain('Lainnya');
    expect(html).toContain('Tidak jadi dikerjakan');
    expect(html).toContain(`maxLength="${REASON_MAX_LENGTH}"`);
    expect(html).toContain('Batal');
    expect(html).toContain('Batalkan tugas');
    expect(html).not.toContain('>OK<');
  });

  it('labels the note optional unless it is required', () => {
    const base = { title: 't', confirmLabel: 'Simpan', onSubmit: () => {}, onClose: () => {} };
    expect(render(<ReasonForm {...base} />)).toContain('boleh dikosongkan');
    expect(render(<ReasonForm {...base} requireNote />)).not.toContain('boleh dikosongkan');
  });

  it('opens through modals.open with the title and returns its id', () => {
    let opened: Parameters<typeof modals.open>[0] | null = null;
    spies.push(
      spyOn(modals, 'open').mockImplementation(((p: Parameters<typeof modals.open>[0]) => {
        opened = p;
        return 'reason-1';
      }) as unknown as typeof modals.open),
    );
    const id = openReasonModal({
      title: 'Buka lagi tugas',
      confirmLabel: 'Buka lagi',
      onSubmit: () => {},
    });
    expect(id).toBe('reason-1');
    expect((opened as unknown as { title: string }).title).toBe('Buka lagi tugas');
    expect((opened as unknown as { children: unknown }).children).toBeTruthy();
  });
});
