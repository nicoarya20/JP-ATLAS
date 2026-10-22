/** The Trash page cards (wireframe "Sampah"): chip, title, info line, Pulihkan per state, empty states, and "Hapus proyek". */
import { describe, expect, it } from 'bun:test';
import { DENY_UI } from '@server/access/decision';
import { METRICS } from '@server/metrics/config';
import { showsDeleteProject } from '../../app/components/trash/ProjectDeleteItem';
import { restoreBlockedReason } from '../../app/components/trash/RestoreAction';
import { TrashItemCard } from '../../app/components/trash/TrashItemCard';
import { TrashList } from '../../app/components/trash/TrashList';
import {
  TRASH_BLOCKED_COPY,
  TRASH_CONFIRM_COPY,
  TRASH_EMPTY_COPY,
  TRASH_PAGE_COPY,
} from '../../app/components/trash/trash.copy';
import { trashConfirmText } from '../../app/components/trash/useTrashActions';
import type {
  TrashEventItem,
  TrashItem,
  TrashProjectItem,
  TrashTaskItem,
} from '../../app/lib/trash-api';
import { renderUi } from '../support/render-ui';

const timing = {
  deletedAt: '2026-10-06T03:00:00.000Z', // test-only: 6 Oct 10.00 WIB
  restorableUntil: '2026-11-04',
  daysLeft: 29,
  deletedBy: { id: 'u-1', name: 'Nico' },
};
const event = (over: Partial<TrashEventItem> = {}): TrashEventItem => ({
  ...timing,
  kind: 'event',
  id: 'e-1',
  title: 'Rapat coba-coba',
  eventKind: 'meeting',
  startsAt: '2026-10-08T03:00:00.000Z', // test-only
  project: null,
  blockedBy: null,
  projectInTrash: false,
  can: { restore: true },
  ...over,
});
const task = (over: Partial<TrashTaskItem> = {}): TrashTaskItem => ({
  ...timing,
  kind: 'task',
  id: 't-1',
  number: 21,
  title: 'Tes duplikat login',
  project: { id: 'p-1', name: 'Atlas' },
  blockedBy: null,
  projectInTrash: false,
  can: { restore: true },
  ...over,
});
const project = (over: Partial<TrashProjectItem> = {}): TrashProjectItem => ({
  ...timing,
  kind: 'project',
  id: 'p-2',
  name: 'Uji coba aplikasi lansia',
  cascade: { tasks: 8, events: 2 },
  can: { restore: true },
  ...over,
});

const card = (item: TrashItem, over: Partial<Parameters<typeof TrashItemCard>[0]> = {}) =>
  renderUi(
    <TrashItemCard
      item={item}
      restoring={false}
      busyElsewhere={false}
      highlighted={false}
      onRestore={() => {}}
      onViewProject={() => {}}
      {...over}
    />,
  );

const list = (items: TrashItem[], over: Partial<Parameters<typeof TrashList>[0]> = {}) =>
  renderUi(
    <TrashList
      tab="all"
      items={items}
      total={items.length}
      loading={false}
      error={null}
      hasMore={false}
      loadingMore={false}
      onMore={() => {}}
      restoringKey={null}
      highlightKey={null}
      onRestore={() => {}}
      onViewProject={() => {}}
      {...over}
    />,
  );

describe('TrashItemCard', () => {
  it('draws an event: chip, title, "Tanpa proyek" and the info line', async () => {
    const out = await card(event());
    expect(out).toContain('Event');
    expect(out).toContain('Rapat coba-coba');
    expect(out).toContain('Tanpa proyek · Dihapus oleh Nico · 6 Okt · Sisa 29 hari');
    expect(out).toContain('Pulihkan');
  });

  it('numbers a task title and names its project', async () => {
    const out = await card(task());
    expect(out).toContain('#21 Tes duplikat login');
    expect(out).toContain('Proyek Atlas · Dihapus oleh Nico · 6 Okt · Sisa 29 hari');
  });

  it('says what went with a project', async () => {
    const out = await card(project());
    expect(out).toContain('Uji coba aplikasi lansia');
    expect(out).toContain(
      'Dihapus oleh Nico · 6 Okt · Sisa 29 hari · Termasuk 8 tugas dan 2 event',
    );
  });

  it('turns Pulihkan off and points at the project while it is in the Trash', async () => {
    const blocked = task({
      projectInTrash: true,
      blockedBy: { projectId: 'p-9', name: 'Atlas', visible: true },
      can: { restore: 'PROJECT_IN_TRASH' },
    });
    const out = await card(blocked);
    expect(out).toContain('Proyek Atlas (ada di Sampah)');
    expect(out).toContain(TRASH_BLOCKED_COPY.restoreFirst);
    expect(out).toContain(TRASH_BLOCKED_COPY.viewProject);
    expect(out).toMatch(/<button[^>]*disabled[^>]*>/);
  });

  it('asks for the project manager instead of linking to a project the caller cannot open', async () => {
    const out = await card(
      event({
        project: { id: 'p-9', name: 'Atlas' },
        projectInTrash: true,
        blockedBy: { projectId: 'p-9', name: 'Atlas', visible: false },
        can: { restore: 'PROJECT_IN_TRASH' },
      }),
    );
    expect(out).toContain(TRASH_BLOCKED_COPY.askManager);
    expect(out).not.toContain(TRASH_BLOCKED_COPY.viewProject);
  });

  it('shows loading on the running card and no button without can.restore', async () => {
    expect(await card(task(), { restoring: true })).toContain('data-loading');
    expect(await card(task({ can: {} }))).not.toContain('<button');
  });

  it('names an account that no longer exists honestly', async () => {
    expect(await card(task({ deletedBy: null }))).toContain(
      'Dihapus oleh akun yang sudah tidak ada',
    );
  });

  it('disables the button with the reason when the server refuses', () => {
    expect(restoreBlockedReason('EXPIRED')).toBe(DENY_UI.EXPIRED.message);
    expect(restoreBlockedReason(true)).toBeNull();
    expect(restoreBlockedReason(undefined)).toBeNull();
  });
});

describe('TrashList', () => {
  it('shows the summary with the retention from the one constant, then every card', async () => {
    const out = await list([event(), task(), project()]);
    expect(out).toContain(`3 item · dihapus otomatis setelah ${METRICS.TRASH_RETENTION_DAYS} hari`);
    expect(out.match(/Pulihkan<\/span>/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it.each(['all', 'project', 'task', 'event'] as const)(
    'has an empty state on the %s tab',
    async (tab) => {
      const out = await list([], { tab });
      expect(out).toContain(TRASH_EMPTY_COPY[tab].title);
      expect(out).not.toContain('item · dihapus');
    },
  );

  it('shows a skeleton while loading and the message when the load fails', async () => {
    expect(await list([], { loading: true })).toContain('aria-busy="true"');
    const failed = await list([], { error: 'Koneksi terputus.' });
    expect(failed).toContain(TRASH_PAGE_COPY.loadFailed);
    expect(failed).toContain('Koneksi terputus.');
  });

  it('offers "Tampilkan lebih banyak" only when there is another page', async () => {
    expect(await list([task()], { hasMore: true })).toContain(TRASH_PAGE_COPY.more);
    expect(await list([task()])).not.toContain(TRASH_PAGE_COPY.more);
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
