import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { DENY_UI } from '@server/access/decision';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { showsDeleteProject } from '../../app/components/trash/ProjectDeleteItem';
import {
  RestoreButton,
  restoreBlockedReason,
  TrashCard,
  TrashProjectList,
} from '../../app/components/trash/TrashProjectList';
import {
  TRASH_CONFIRM_COPY,
  TRASH_EMPTY_COPY,
  TRASH_ROW_COPY,
} from '../../app/components/trash/trash.copy';
import { trashConfirmText } from '../../app/components/trash/useTrashActions';
import type { TrashProjectItem } from '../../app/lib/trash-api';

const html = (node: ReactNode) => renderToStaticMarkup(<MantineProvider>{node}</MantineProvider>);

const item = (over: Partial<TrashProjectItem> = {}): TrashProjectItem => ({
  kind: 'project',
  id: 'p-1',
  name: 'Renovasi Dapur',
  deletedAt: '2026-10-07T03:00:00.000Z', // test-only
  deletedBy: { id: 'u-1', name: 'Dodi' },
  restorableUntil: '2026-11-05',
  can: { restore: true },
  ...over,
});

const list = (items: TrashProjectItem[]) =>
  html(
    <TrashProjectList
      items={items}
      total={items.length}
      hasMore={false}
      loadingMore={false}
      onMore={() => {}}
      restoringId={null}
      onRestore={() => {}}
    />,
  );

const noop = { restoringId: null, onRestore: () => {} };

describe('TrashProjectList', () => {
  it('shows the "Sampah kosong" empty state without a table', () => {
    const out = list([]);
    expect(out).toContain(TRASH_EMPTY_COPY.title);
    expect(out).toContain(TRASH_EMPTY_COPY.description);
    expect(out).not.toContain('<table');
  });

  it('renders the table and the mobile cards with name, deleter and both dates', () => {
    const out = list([item()]);
    expect(out).toContain('<table');
    expect(out).toContain('role="list"');
    expect(out).toContain('Renovasi Dapur');
    expect(out).toContain('Dodi');
    expect(out).toContain('7 Okt 2026');
    expect(out).toContain('5 Nov 2026');
  });

  it('never promises an automatic or permanent delete', () => {
    expect(list([item()]).toLowerCase()).not.toContain('otomatis');
    expect(list([item()]).toLowerCase()).not.toContain('permanen');
  });
});

describe('restore button', () => {
  it('shows "Pulihkan" only when can.restore is present', () => {
    expect(html(<RestoreButton item={item()} {...noop} />)).toContain(TRASH_ROW_COPY.restore);
    expect(html(<RestoreButton item={item({ can: {} })} {...noop} />)).not.toContain(
      TRASH_ROW_COPY.restore,
    );
  });

  it('disables it with the reason when the server refuses', () => {
    const out = html(<RestoreButton item={item({ can: { restore: 'EXPIRED' } })} {...noop} />);
    expect(out).toContain('disabled');
    expect(restoreBlockedReason('EXPIRED')).toBe(DENY_UI.EXPIRED.message);
    expect(restoreBlockedReason(true)).toBeNull();
    expect(restoreBlockedReason(undefined)).toBeNull();
  });

  it('marks the running row as loading', () => {
    const out = html(<RestoreButton item={item()} restoringId="p-1" onRestore={() => {}} />);
    expect(out).toContain('data-loading');
  });
});

describe('TrashCard (mobile)', () => {
  it('names an account that no longer exists honestly', () => {
    const out = html(<TrashCard item={item({ deletedBy: null })} {...noop} />);
    expect(out).toContain(TRASH_ROW_COPY.unknownDeleter);
    expect(out).toContain(TRASH_ROW_COPY.until('5 Nov 2026'));
  });
});

describe('Hapus proyek', () => {
  it('is offered only when can.trash is true, hidden for ROLE_CANNOT_TRASH', () => {
    expect(showsDeleteProject({ trash: true })).toBe(true);
    expect(showsDeleteProject({ trash: 'ROLE_CANNOT_TRASH' })).toBe(false);
    expect(showsDeleteProject({})).toBe(false);
  });

  it('names the project, the tasks that move and the restore limit', () => {
    const t = trashConfirmText({ id: 'p-1', name: 'Renovasi Dapur', tasks: 4 }, '2026-10-07');
    expect(t.title).toBe(TRASH_CONFIRM_COPY.title('Renovasi Dapur'));
    expect(t.body).toContain('4 tugas');
    expect(t.body).toContain('5 Nov 2026');
  });
});
