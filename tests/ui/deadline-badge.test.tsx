import { describe, expect, it } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DeadlineBadge, ExtensionList } from '../../app/components/projects/summary/DeadlineBadge';
import { BADGE_COPY } from '../../app/components/projects/summary/summary.copy';
import type { DeadlineExtensionDto } from '../../app/lib/project-deadline-api';
import { render } from './project-fixtures';

const withClient = (node: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

const extension = (over: Partial<DeadlineExtensionDto> = {}): DeadlineExtensionDto => ({
  id: 'e-1',
  projectId: 'p-1',
  oldDueDate: '2026-10-15', // test-only
  newDueDate: '2026-10-31', // test-only
  reasonCategory: 'dependency',
  reason: 'Menunggu vendor cat',
  extendedBy: 'u-1',
  extendedByName: 'Nico',
  createdAt: '2026-10-07T03:00:00.000Z', // test-only
  ...over,
});

describe('DeadlineBadge', () => {
  it('shows nothing for a project that was never extended', async () => {
    expect(await render(withClient(<DeadlineBadge projectId="p-1" count={0} />))).not.toContain(
      'Diperpanjang',
    );
  });

  it('reads "Diperpanjang ×N" on a button, and does not ask for the history until opened', async () => {
    const html = await render(withClient(<DeadlineBadge projectId="p-1" count={3} />));
    expect(html).toContain(BADGE_COPY.label(3));
    expect(html).toMatch(/<button[^>]*aria-label="Diperpanjang ×3\. Riwayat perpanjangan tenggat"/);
    expect(html).not.toContain(BADGE_COPY.loading);
  });
});

describe('ExtensionList', () => {
  it('lists old → new date, category with reason, who and when', async () => {
    const html = await render(<ExtensionList items={[extension()]} total={1} />);
    expect(html).toContain('15 Okt 2026 → 31 Okt 2026');
    expect(html).toContain('Menunggu pihak lain: Menunggu vendor cat');
    expect(html).toContain('oleh Nico');
    expect(html).toContain('7 Okt 2026');
  });

  it('names a deleted account instead of leaving the line blank', async () => {
    const html = await render(
      <ExtensionList items={[extension({ extendedBy: null, extendedByName: null })]} total={1} />,
    );
    expect(html).toContain('oleh akun yang sudah dihapus');
  });

  it('keeps the order it is given and says when there are more than shown', async () => {
    const html = await render(
      <ExtensionList
        items={[
          extension({ id: 'e-2', oldDueDate: '2026-10-31', newDueDate: '2026-11-14' }),
          extension({ id: 'e-1' }),
        ]}
        total={5}
      />,
    );
    expect(html.indexOf('31 Okt 2026 → 14 Nov 2026')).toBeLessThan(
      html.indexOf('15 Okt 2026 → 31 Okt 2026'),
    );
    expect(html).toContain(BADGE_COPY.more(2, 5));
  });

  it('has an informative empty state', async () => {
    expect(await render(<ExtensionList items={[]} total={0} />)).toContain(BADGE_COPY.empty);
  });
});
