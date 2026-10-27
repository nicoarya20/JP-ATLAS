// The Archive against a stubbed `/api/app/trash`: the mapping, the retention the server counted,
// the controls its `can{}` allows, and the two writes.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import {
  archiveCard,
  archiveOf,
  capState,
  chipLabels,
  getArchiveDelete,
  parseCardKey,
  retentionText,
} from '../../src/data/archive';
import { trashList } from '../../src/data/archive.api';
import type { TrashCountsWire, TrashItemWire } from '../../src/data/archive.api';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { ArchiveScreen } from '../../src/screens/archive/archive.screen';
import { DeleteScreen } from '../../src/screens/archive/delete.screen';
import {
  type Reply,
  serveAppApi,
  trashBody,
  trashEvent,
  trashProject,
  trashTask,
} from '../helpers/team-trash-server';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

/** What the stub answers next. */
let trash: Reply = { body: trashBody([]) };
let restore: Reply = { body: { id: 'p-old', tasks: 5 } };
let purge: Reply = { body: { kind: 'project', id: 'p-old', purged: { projects: 1, tasks: 5, events: 1 } } };

const server = serveAppApi(({ path, method }) => {
  if (path === '/api/app/trash') return trash;
  if (path.endsWith('/restore')) return restore;
  if (method === 'DELETE' && path.startsWith('/api/app/trash/')) return purge;
  if (path === '/api/app/home' || path === '/api/app/events' || path === '/api/app/tasks/counts') {
    return { body: { items: [], nextCursor: null, caps: { createEvent: true } } };
  }
  return { status: 500, body: { error: `no stub for ${path}`, code: 'X', status: 500 } };
});

beforeEach(() => {
  trash = { body: trashBody([]) };
  restore = { body: { id: 'p-old', tasks: 5 } };
  jest.clearAllMocks();
});

const page = (items: Record<string, unknown>[], counts?: TrashCountsWire, total?: number) =>
  archiveOf({
    rows: items as unknown as TrashItemWire[],
    total: total ?? items.length,
    extra: counts ?? { project: 1, task: 1, event: 1 },
  });

describe('one card', () => {
  it('titles each kind the way the server names it', () => {
    expect(archiveCard(trashProject() as never).title).toBe('Old Client Portal');
    expect(archiveCard(trashTask() as never).title).toBe('#21 Duplicate login test');
    expect(archiveCard(trashEvent() as never).title).toBe('Test meeting');
  });

  it('reads deletedAt as a day in the team zone, not in UTC', () => {
    // 2026-10-06T17:30Z is already Oct 7 in Asia/Jakarta (00:30), which is the day to show.
    const card = archiveCard(trashProject({ deletedAt: '2026-10-06T17:30:00.000Z' }) as never);
    expect(card.meta).toContain('Oct 7');
    expect(card.meta).not.toContain('Oct 6');
  });

  it('says where a row came from, and that a project came from nowhere', () => {
    expect(archiveCard(trashTask() as never).meta).toMatch(/^Atlas · Deleted by Nico · /);
    expect(archiveCard(trashEvent() as never).meta).toMatch(/^No project · /);
    expect(archiveCard(trashProject() as never).meta).toMatch(/^Project · /);
  });

  it('does not name a deleter who no longer has an account', () => {
    expect(archiveCard(trashTask({ deletedBy: null }) as never).meta).toContain('· Deleted ·');
  });

  it('counts what a trashed project takes along', () => {
    expect(archiveCard(trashProject() as never).includes).toBe('5 tasks and 1 events');
    expect(archiveCard(trashTask() as never).includes).toBeUndefined();
  });

  it('shows the retention the server counted, and says when it has run out', () => {
    expect(retentionText(12, '2026-11-05')).toBe('12 days left to restore (until Nov 5)');
    expect(retentionText(1, '2026-10-08')).toBe('1 day left to restore (until Oct 8)');
    expect(retentionText(0, '2026-10-01')).toMatch(/^The restore window has passed/);
  });

  it('names the project a blocked row waits for only when the viewer may see it', () => {
    const visible = archiveCard(
      trashTask({ blockedBy: { projectId: 'p-atlas', name: 'Atlas', visible: true }, projectInTrash: true }) as never,
    );
    const hidden = archiveCard(
      trashTask({ blockedBy: { projectId: 'p-x', name: 'Secret', visible: false }, projectInTrash: true }) as never,
    );
    expect(visible.blocked).toContain('Atlas');
    expect(hidden.blocked).not.toContain('Secret');
  });
});

describe('the capabilities', () => {
  it('hides a control for an absent key, which is what a non-Admin gets for purge', () => {
    expect(capState(undefined)).toBe('hidden');
    expect(archiveCard(trashProject() as never).purge).toBe('hidden');
  });

  it('enables it for true and disables it for a deny code, with the server reason', () => {
    expect(capState(true)).toBe('enabled');
    const expired = archiveCard(trashProject({ can: { restore: 'EXPIRED' } }) as never);
    expect(expired.restore).toBe('disabled');
    expect(expired.restoreReason).toMatch(/Masa pemulihannya sudah lewat/);
  });

  it('hides a control for a code it does not know, exactly as the server would', () => {
    expect(capState('SOMETHING_NEW')).toBe('hidden');
  });
});

describe('the list', () => {
  it('counts every kind on the chips, whatever the page was narrowed to', () => {
    expect(chipLabels({ project: 2, task: 3, event: 1 })).toEqual([
      'All 6',
      'Projects 2',
      'Tasks 3',
      'Events 1',
    ]);
  });

  it('counts the items of the filter, in its own words', () => {
    expect(page([trashTask()], undefined, 1)?.count).toBe('1 item');
    expect(page([trashTask()], undefined, 5)?.count).toBe('5 items');
    expect(page([trashTask()], undefined, 5)?.hasMore).toBe(true);
  });

  it('is null until the first answer, which is how a screen knows to wait', () => {
    expect(archiveOf(null)).toBeNull();
  });

  it('asks the server for the kind, and for a page rather than an offset', async () => {
    trash = { body: trashBody(Array.from({ length: 25 }, () => trashTask()), { total: 40 }) };
    const list = trashList('task');
    await list.ensure();
    expect(server.to('/api/app/trash')[0]?.search.get('kind')).toBe('task');
    expect(server.to('/api/app/trash')[0]?.search.get('page')).toBe('1');
    await list.more();
    expect(server.to('/api/app/trash')[1]?.search.get('page')).toBe('2');
  });
});

describe('the card keys', () => {
  it('survive a round trip through a route param, uuid dashes included', () => {
    const key = archiveCard(trashTask({ id: '0f9e-4a2b-11ee-8c90' }) as never).key;
    expect(key).toBe('task-0f9e-4a2b-11ee-8c90');
    expect(parseCardKey(key)).toEqual({ kind: 'task', id: '0f9e-4a2b-11ee-8c90' });
  });

  it('reject a key that names no kind this app knows', () => {
    expect(parseCardKey('row-1')).toBeNull();
    expect(parseCardKey('task')).toBeNull();
    expect(parseCardKey('task-')).toBeNull();
  });
});

describe('the Archive screen', () => {
  const settled = () =>
    waitFor(() => expect(screen.queryByTestId('archive-loading')).not.toBeOnTheScreen());

  it('shows the cards, the retention and the chips', async () => {
    trash = { body: trashBody([trashProject()], { counts: { project: 1, task: 0, event: 0 } }) };
    await render(<ArchiveScreen />, { wrapper: GluestackUIProvider });
    await settled();
    expect(screen.getByTestId('archive-project-p-old')).toBeOnTheScreen();
    expect(screen.getByText('12 days left to restore (until Nov 5)')).toBeOnTheScreen();
    expect(screen.getByLabelText('All 1')).toBeOnTheScreen();
  });

  it('shows the empty state only when every kind is at zero', async () => {
    trash = { body: trashBody([], { counts: { project: 0, task: 0, event: 0 }, total: 0 }) };
    await render(<ArchiveScreen />, { wrapper: GluestackUIProvider });
    await settled();
    expect(screen.getByTestId('archive-empty')).toBeOnTheScreen();
  });

  it('hides Delete forever where the server gave no purge capability', async () => {
    trash = { body: trashBody([trashProject()]) };
    await render(<ArchiveScreen />, { wrapper: GluestackUIProvider });
    await settled();
    expect(screen.queryByLabelText(/^Delete forever: /)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Restore: Old Client Portal')).toBeOnTheScreen();
  });

  it('shows Delete forever when it is allowed, and opens the sheet', async () => {
    trash = { body: trashBody([trashProject({ can: { restore: true, purge: true } })]) };
    await render(<ArchiveScreen />, { wrapper: GluestackUIProvider });
    await settled();
    await fireEvent.press(screen.getByLabelText('Delete forever: Old Client Portal'));
    expect(router.push).toHaveBeenCalledWith('/more/archive/project-p-old/delete');
  });

  it('restores through the server and says what came back with it', async () => {
    trash = { body: trashBody([trashProject()]) };
    await render(<ArchiveScreen />, { wrapper: GluestackUIProvider });
    await settled();
    await fireEvent.press(screen.getByLabelText('Restore: Old Client Portal'));
    await waitFor(() => expect(screen.getByText('Project restored with 5 tasks')).toBeOnTheScreen());
    expect(server.calls().some((c) => c.path === '/api/app/trash/project/p-old/restore')).toBe(true);
  });

  it("reports a refused restore with the server's own sentence", async () => {
    trash = { body: trashBody([trashTask({ projectInTrash: true })]) };
    restore = {
      status: 409,
      body: {
        error: 'Proyeknya ada di Sampah. Pulihkan proyeknya dulu.',
        code: 'PROJECT_IN_TRASH',
        status: 409,
      },
    };
    await render(<ArchiveScreen />, { wrapper: GluestackUIProvider });
    await settled();
    await fireEvent.press(screen.getByLabelText('Restore: #21 Duplicate login test'));
    await waitFor(() =>
      expect(
        screen.getByText(
          'Could not restore it: Proyeknya ada di Sampah. Pulihkan proyeknya dulu.',
        ),
      ).toBeOnTheScreen(),
    );
  });
});

describe('Delete forever', () => {
  it('offers nothing for a row that is in no loaded list', async () => {
    await render(<DeleteScreen entryKey="task-gone" />, { wrapper: GluestackUIProvider });
    expect(screen.getByText('This item is no longer in Archive.')).toBeOnTheScreen();
  });

  it('refuses without the capability, and unlocks only once the name is typed', async () => {
    trash = { body: trashBody([trashProject({ can: { restore: true, purge: true } })]) };
    await trashList('all').ensure();
    expect(getArchiveDelete('project-p-old')?.allowed).toBe(true);

    await render(<DeleteScreen entryKey="project-p-old" />, { wrapper: GluestackUIProvider });
    const button = screen.getByTestId('confirm-action');
    expect(button).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('type-to-confirm'), 'Old Client Portal');
    expect(screen.getByTestId('confirm-action')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    await waitFor(() =>
      expect(
        server.calls().some((c) => c.method === 'DELETE' && c.path === '/api/app/trash/project/p-old'),
      ).toBe(true),
    );
  });
});
