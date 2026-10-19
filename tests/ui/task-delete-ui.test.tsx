/** Hapus tugas (S6 D1, T1): no dialog, an "Urungkan" toast that restores, menu per can.trash, Trash page task section. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MantineProvider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { menuItemsOf } from '../../app/components/tasks/TaskMenu';
import { hasRowMenu, TaskRowMenu } from '../../app/components/tasks/TaskRowMenu';
import { DELETE_COPY } from '../../app/components/tasks/tasks.copy';
import {
  deleteOptions,
  restoreOptions,
  type TrashFlow,
} from '../../app/components/tasks/useTaskDelete';
import { TrashTaskCard, TrashTaskList } from '../../app/components/trash/TrashTaskList';
import { TRASH_COPY } from '../../app/components/trash/trash.copy';
import { notify, UNDO_LABEL } from '../../app/components/ui/notify';
import type { TrashTaskItem } from '../../app/lib/trash-api';
import { runMutation } from '../../app/lib/use-api-mutation';

const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only
async function render(node: ReactNode): Promise<string> {
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

describe('menu items follow the server can.trash', () => {
  it('offers delete last when can.trash is true or a deny code, hides it when absent', () => {
    expect(menuItemsOf({ number: 1, can: { update: true, cancel: true, trash: true } })).toEqual([
      'edit',
      'cancel',
      'delete',
    ]);
    expect(menuItemsOf({ number: 1, can: { trash: 'IMPERSONATING' } })).toEqual(['delete']);
    expect(menuItemsOf({ number: 1, can: { update: true } })).not.toContain('delete');
    expect(hasRowMenu({ can: {} })).toBe(false);
    expect(hasRowMenu({ can: { trash: true } })).toBe(true);
  });

  it('renders the row menu icon only for a viewer who may delete', async () => {
    const label = DELETE_COPY.rowMenuLabel(42);
    expect(await render(<TaskRowMenu task={{ number: 42, can: { trash: true } }} />)).toContain(
      `aria-label="${label}"`,
    );
    expect(await render(<TaskRowMenu task={{ number: 42, can: {} }} />)).not.toContain(label);
  });
});

describe('the delete flow (T1)', () => {
  const deleted = { kind: 'task' as const, id: 't-1', number: 42, label: '#42 Pasang' };
  const flow = (over: Partial<TrashFlow> = {}) => {
    const calls: string[] = [];
    const undos: Array<() => void> = [];
    const f: TrashFlow = {
      remove: async (ref) => {
        calls.push(`remove:${ref}`);
        return deleted;
      },
      restore: async (id) => {
        calls.push(`restore:${id}`);
        return { id, number: 42 };
      },
      refresh: async () => void calls.push('refresh'),
      undo: (message, onUndo) => {
        calls.push(`undo:${message}`);
        undos.push(onUndo);
      },
      ...over,
    };
    return { f, calls, undos };
  };

  it('calls the API at once, leaves the page, then offers Urungkan that restores by id', async () => {
    const { f, calls, undos } = flow();
    const restored: unknown[] = [];
    let left = false;
    const opts = deleteOptions(
      f,
      (t) => restored.push(t),
      () => (left = true),
    );
    const r = await runMutation(opts, { ref: '42' }, () => {});
    expect(r.ok).toBe(true);
    expect(calls.slice(0, 1)).toEqual(['remove:42']);
    expect(calls).toContain(`undo:${DELETE_COPY.deleted}`);
    expect(left).toBe(true);
    undos[0]?.();
    expect(restored).toEqual([{ id: 't-1', number: 42 }]);
    const back = await runMutation(restoreOptions(f), { id: 't-1', number: 42 }, () => {});
    expect(back.ok).toBe(true);
    expect(calls).toContain('restore:t-1');
  });

  it('shows a red actionable toast when the delete fails and does not offer Urungkan', async () => {
    const err = spyOn(notify, 'error').mockImplementation(() => {});
    const { f, calls } = flow({ remove: async () => Promise.reject(new Error('putus')) });
    const r = await runMutation(
      deleteOptions(f, () => {}),
      { ref: '42' },
      () => {},
    );
    expect(r.ok).toBe(false);
    expect(err).toHaveBeenCalledWith(DELETE_COPY.deleteFailed, expect.any(String));
    expect(calls.some((c) => c.startsWith('undo:'))).toBe(false);
    err.mockRestore();
  });

  it('spins the button around the call (loading true then false)', async () => {
    const states: boolean[] = [];
    await runMutation(
      deleteOptions(flow().f, () => {}),
      { ref: '42' },
      (v) => states.push(v),
    );
    expect(states).toEqual([true, false]);
  });
});

describe('the Urungkan toast', () => {
  afterEach(() => spyOn(notifications, 'show').mockRestore());
  it('stays about ten seconds and carries the Urungkan button', () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    notify.undo(DELETE_COPY.deleted, () => {});
    const arg = show.mock.calls[0]?.[0] as { autoClose: number; message: unknown };
    expect(arg.autoClose).toBe(10_000);
    expect(JSON.stringify(arg.message)).toContain(UNDO_LABEL);
  });
});

describe('no confirmation dialog on delete (T1)', () => {
  it.each(['useTaskDelete.ts', 'TaskDeleteItem.tsx', 'TaskRowMenu.tsx', 'TaskMenu.tsx'])(
    '%s opens no confirm',
    (file) => {
      const src = readFileSync(
        path.join(import.meta.dir, '../../app/components/tasks', file),
        'utf8',
      ).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(src).not.toMatch(/openConfirmModal|confirmAction|window\.confirm|modals\./);
    },
  );
});

const row = (over: Partial<TrashTaskItem> = {}): TrashTaskItem => ({
  kind: 'task',
  id: 't-1',
  number: 42,
  title: 'Pasang keramik',
  project: { id: 'p-1', name: 'Renovasi Dapur' },
  blockedBy: null,
  deletedAt: '2026-10-07T03:00:00.000Z', // test-only
  deletedBy: { id: 'u-1', name: 'Dodi' },
  restorableUntil: '2026-11-05',
  can: { restore: true },
  ...over,
});
const noop = { restoringId: null, onRestore: () => {} };
const list = (items: TrashTaskItem[], restoringId: string | null = null) =>
  render(
    <TrashTaskList
      items={items}
      total={items.length}
      hasMore={false}
      loadingMore={false}
      onMore={() => {}}
      restoringId={restoringId}
      onRestore={() => {}}
    />,
  );

describe('Trash page task section', () => {
  it('shows an informative empty state', async () => {
    const out = await list([]);
    expect(out).toContain(TRASH_COPY.noTasks.title);
    expect(out).not.toContain('<table');
  });

  it('renders table and mobile cards with number, project, deleter and Pulihkan', async () => {
    const out = await list([row()]);
    expect(out).toContain('<table');
    expect(out).toContain('role="list"');
    expect(out).toContain('#42 · Renovasi Dapur');
    expect(out).toContain('Dodi');
    expect(out).toContain('5 Nov 2026');
    expect(out).toContain('Pulihkan');
  });

  it('greys Pulihkan out with the reason while the project is in the Trash', async () => {
    const out = await list([
      row({
        blockedBy: { projectId: 'p-1', name: 'Renovasi Dapur' },
        can: { restore: 'PROJECT_IN_TRASH' },
      }),
    ]);
    expect(out).toContain(TRASH_COPY.blocked);
    expect(out).toMatch(/<button[^>]*disabled[^>]*>/);
  });

  it('shows loading on the running row only and no button without can.restore', async () => {
    expect(await list([row()], 't-1')).toContain('data-loading');
    expect(await render(<TrashTaskCard item={row({ can: {} })} {...noop} />)).not.toContain(
      '<button',
    );
  });

  it('never promises an automatic or permanent delete', async () => {
    const out = (await list([row()])).toLowerCase();
    expect(out).not.toContain('otomatis');
    expect(out).not.toContain('permanen');
  });
});
