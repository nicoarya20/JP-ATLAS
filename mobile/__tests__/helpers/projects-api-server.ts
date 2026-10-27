// A stubbed `/api/app/projects*` for the Projects screen tests, answered from the wire fixtures the
// way the server would answer them.
//
// Two things this stub does on purpose:
//
// - **It honours the query string.** `status=`, `q=`, `sort=` and `perhatian=` are applied to the
//   rows, because a stub that serves the same rows whatever it was asked for proves nothing about
//   the request the screen made — and the request is the whole point now that filtering is the
//   server's.
// - **It leaves the writes to the test.** `serveAuth` hands a route the URL alone, with no method
//   and no body, so this file cannot tell a role change from a removal: both are
//   `/members/:userId`. Rather than guess from hidden state, a test that is about a write passes
//   `memberWrite` and says what that route answers. What the write was *addressed to* is asserted
//   from `serveAuth().calls`, which is the contract that matters — the userId in the path, never a
//   name (K4).
import type {
  WireMemberItem,
  WireMemberList,
  WireProjectListItem,
} from '@/data/projects.api.types';
import type { WireTaskListItem } from '@/data/tasks.api.types';

import type { AuthReply, AuthRoutes } from './auth-server';
import { TEST_CLOCK } from './session-fixtures';
import {
  DEFAULT_MEMBERS,
  PROJECT_TASKS,
  wireActivity,
  wireDetail,
  wireExtensions,
  wireListItem,
  wireMembers,
  wirePage,
  wirePicker,
  wirePlan,
  wireTaskPage,
  wireWhoami,
} from './projects-wire';

const paramsOf = (url: string) => new URLSearchParams(url.slice(url.indexOf('?') + 1));

/**
 * The rows the prototype's list showed, as the server would send them: same ids, names, statuses,
 * deadlines and progress as `src/data/sample/projects.ts`, so the assertions ported from Phase 1
 * still read about the same six projects.
 */
export const SAMPLE_PROJECTS: readonly WireProjectListItem[] = [
  wireListItem({
    id: 'website',
    name: 'Company Profile Website',
    status: 'completed',
    dueDate: '2026-09-01',
    startDate: '2026-06-01',
    progress: { done: 10, total: 10, percent: 100 },
    condition: null,
  }),
  wireListItem({
    id: 'migration',
    name: 'Legacy Data Migration',
    dueDate: '2026-09-30',
    progress: { done: 8, total: 10, percent: 80 },
  }),
  wireListItem({
    id: 'sinar',
    name: 'PT Sinar Client Portal',
    dueDate: '2026-10-20',
    progress: { done: 7, total: 20, percent: 35 },
    condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  }),
  wireListItem({
    id: 'atlas',
    name: 'Atlas Project',
    dueDate: '2026-10-31',
    progress: { done: 7, total: 10, percent: 70 },
    condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  }),
  wireListItem({
    id: 'attendance',
    name: 'Attendance App',
    status: 'draft',
    dueDate: '2026-12-07',
    progress: { done: 0, total: 4, percent: 0 },
    condition: null,
  }),
  wireListItem({
    id: 'tools',
    name: 'Internal Tools',
    status: 'on_hold',
    dueDate: '2026-12-15',
    progress: { done: 5, total: 10, percent: 50 },
    condition: null,
  }),
];

/** The three the signed-in Member is actually in, for the list a Member's `scope=mine` answers. */
export const MEMBER_PROJECTS: readonly WireProjectListItem[] = SAMPLE_PROJECTS.filter((p) =>
  ['migration', 'atlas', 'tools'].includes(p.id),
);

/**
 * The rows one list request asks for, narrowed the way `server/project/project-list.query.ts`
 * narrows them. Sorting follows `sort=`; the default is the nearest deadline.
 */
export function rowsFor(
  url: string,
  rows: readonly WireProjectListItem[] = SAMPLE_PROJECTS,
): WireProjectListItem[] {
  const p = paramsOf(url);
  const status = p.get('status');
  const q = (p.get('q') ?? '').toLowerCase();
  const attention = p.get('perhatian') === '1';
  const sort = p.get('sort') ?? 'due';
  const kept = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (q && !r.name.toLowerCase().includes(q)) return false;
    // `perhatian=1` merges at risk and late into one flag (GAP A-3).
    if (attention && r.condition?.level !== 'at_risk' && r.condition?.level !== 'off_track') {
      return false;
    }
    return true;
  });
  if (sort === 'name') return [...kept].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'recent') return [...kept].reverse();
  return [...kept].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
}

/**
 * The project's tasks one request asks for.
 *
 * The Overview's three attention sections and the Tasks tab share `/api/app/tasks`, told apart only
 * by the query string, so this picks the rows the same way `server/metrics/schedule.ts` would:
 * `due=overdue` and `due=today` against the test clock, `status=` against the row.
 */
export function taskRowsFor(
  url: string,
  rows: readonly WireTaskListItem[] = PROJECT_TASKS,
): WireTaskListItem[] {
  const p = paramsOf(url);
  const statuses = p.getAll('status');
  const due = p.get('due');
  const q = (p.get('q') ?? '').toLowerCase();
  return rows.filter((r) => {
    if (statuses.length && !statuses.includes(r.status)) return false;
    if (due === 'overdue' && !(r.dueDate && r.dueDate < TEST_CLOCK.today)) return false;
    if (due === 'today' && r.dueDate !== TEST_CLOCK.today) return false;
    if (q && !r.title.toLowerCase().includes(q) && q !== String(r.number)) return false;
    return true;
  });
}

/** The userId a `/members/:userId` write is addressed to, or null for the list itself. */
export function memberIdOf(url: string): string | null {
  const after = url.split('/members/')[1];
  if (!after) return null;
  return decodeURIComponent((after.split('?')[0] ?? '').trim()) || null;
}

const projectIdOfTrash = (url: string) => {
  const after = url.split('/api/app/trash/project/')[1] ?? '';
  return decodeURIComponent((after.split('/')[0] ?? '').split('?')[0] ?? '');
};

const projectIdOf = (url: string) => {
  const after = url.split('/api/app/projects/')[1] ?? '';
  return decodeURIComponent((after.split('?')[0] ?? '').split('/')[0] ?? '');
};

type Opts = {
  rows?: readonly WireProjectListItem[];
  /** Overrides merged into every `GET /projects/:id`, e.g. an empty `can` for a read-only project. */
  detail?: Parameters<typeof wireDetail>[0];
  /**
   * The member list every read answers; defaults to the Lead plus one plain member. Pass a function
   * to keep it mutable, so a write's own answer survives the reload that follows it.
   */
  members?: readonly WireMemberItem[] | (() => readonly WireMemberItem[]);
  /** The project's task rows; defaults to the three the Overview's attention sections read. */
  tasks?: readonly WireTaskListItem[];
  /** Overrides merged into `GET /projects/:id/plan`, e.g. a `nextMilestone`. */
  plan?: Parameters<typeof wirePlan>[0];
  /** Fail `GET /projects/:id` with the server's own sentence, for the retry path. */
  failDetail?: boolean;
  /**
   * Fail `POST /projects/:id/status`, with the server's sentence.
   *
   * This is the write surface a refusal is tested through, because it has a URL of its own: a
   * PATCH to the project and the GET of the project are the same URL, and `serveAuth` hands a route
   * no method, so refusing "the write" there would refuse the read that opens the screen too.
   */
  failStatus?: { status: number; error: string; code?: string };
  /** Fail `POST /trash/project/:id/restore`: past the window, or already deleted forever. */
  failRestore?: { status: number; error: string; code?: string };
  /**
   * What `/members/:userId` answers. Given the userId in the path, it returns the list the server
   * would answer with — so a test shows the removal or the role change it is asserting.
   */
  memberWrite?: (userId: string) => WireMemberList | AuthReply;
};

/**
 * Routes for `serveAuth`. Order matters: `serveAuth` matches the first key that appears anywhere in
 * the URL, so the long paths are offered before `/api/app/projects`, or the list would answer them.
 */
export function projectApiRoutes(o: Opts = {}): AuthRoutes {
  const rows = o.rows ?? SAMPLE_PROJECTS;
  const roster = () => {
    const m = o.members ?? DEFAULT_MEMBERS;
    return typeof m === 'function' ? m() : m;
  };
  return {
    '/api/app/whoami': { body: wireWhoami() },
    '/api/app/team/picker': { body: wirePicker() },
    // The project's Tasks tab and its three attention queries all come from /api/app/tasks.
    '/api/app/tasks': (url: string) => ({ body: wireTaskPage(taskRowsFor(url, o.tasks)) }),
    '/plan': { body: wirePlan(o.plan) },
    '/extensions': { body: wireExtensions() },
    '/activity': { body: wireActivity() },
    '/members': (url: string) => {
      const userId = memberIdOf(url);
      if (!userId) return { body: wireMembers(roster()) };
      const answered = o.memberWrite?.(userId);
      if (!answered) return { body: wireMembers(roster()) };
      return 'items' in answered ? { body: answered } : answered;
    },
    '/extend-deadline': { body: wireDetail(o.detail) },
    '/status': o.failStatus
      ? {
          status: o.failStatus.status,
          body: { error: o.failStatus.error, code: o.failStatus.code ?? 'UNPROCESSABLE' },
        }
      : { body: wireDetail(o.detail) },
    '/lead': { body: wireDetail(o.detail) },
    '/api/app/trash/project/': (url: string) =>
      o.failRestore
        ? {
            status: o.failRestore.status,
            body: { error: o.failRestore.error, code: o.failRestore.code ?? 'CONFLICT' },
          }
        : { body: { id: projectIdOfTrash(url), tasks: 5 } },
    '/api/app/projects?': (url: string) => ({ body: wirePage(rowsFor(url, rows)) }),
    '/api/app/projects/': (url: string) => {
      if (o.failDetail) {
        return { status: 500, body: { error: 'Proyek tidak dapat dimuat', code: 'INTERNAL' } };
      }
      const row = rows.find((r) => r.id === projectIdOf(url));
      // A project that is gone, in the Trash out of reach, or not ours: one 404 by design.
      if (!row) return { status: 404, body: { error: 'Proyek tidak ditemukan', code: 'NOT_FOUND' } };
      return { body: wireDetail({ ...row, ...o.detail }) };
    },
    '/api/app/projects': { body: wireDetail(o.detail) },
  };
}
