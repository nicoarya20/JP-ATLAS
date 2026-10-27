// A stubbed `/api/app/{team,profile,whoami,trash,events}` for the Team, Profile and Archive tests,
// plus the DTO fixtures they build on.
//
// No request leaves the machine: `fetch` is replaced by the one handler `serveEvents` installs (it
// is transport, not events), so a test sees the method, the path and the query string and can
// answer page by page. A path with no answer fails the way a dead network does, naming the gap.
import { resetArchiveApi } from '@/data/archive.api';
import { resetCalendarApi } from '@/data/profile.calendar.api';
import { forgetAllResources } from '@/data/resource';
import { resetTeamApi } from '@/data/team.api';

import { type Call, type Handler, type Reply, serveEvents } from './events-server';
import { resetSessionForTest } from './session-fixtures';

export type { Call, Handler, Reply };

/**
 * Installs a fetch stub for the whole suite and clears everything these modules hold after each
 * test. Nothing unmounts in these tests, so a resource left loaded would leak into the next one
 * exactly as it would leak into the next account (`src/data/resource.ts`). The session and the
 * server's clock are already seeded per test by jest.setup-after-env.js.
 */
export function serveAppApi(handler: Handler) {
  let server: ReturnType<typeof serveEvents> | null = null;
  beforeEach(() => {
    server = serveEvents(handler);
  });
  afterEach(() => {
    server?.restore();
    server = null;
    resetTeamApi();
    resetArchiveApi();
    resetCalendarApi();
    forgetAllResources();
    resetSessionForTest();
  });
  return {
    calls: () => server?.calls ?? [],
    /** Calls to one path, in order. */
    to: (path: string) => (server?.calls ?? []).filter((c) => c.path === path),
  };
}

// --- fixtures ---------------------------------------------------------------------------------

/** `GET /api/app/whoami` for one role. */
export const whoami = (role = 'project_manager') => ({
  userId: 'u-nico',
  name: 'Nico Arya',
  role,
  caps: { createProject: role !== 'member', createEvent: true, dashboard: false, dev: false },
});

/** `GET /api/app/profile`. */
export const profileBody = (over: Record<string, unknown> = {}) => ({
  userId: 'u-nico',
  name: 'Nico Arya',
  email: 'nico@kantor.id',
  displayName: 'Nico Pratama',
  nickname: 'Nico',
  phone: null,
  jobTitle: 'Project Manager',
  department: 'Product',
  textSize: 'base',
  ...over,
});

/** One `TeamPerson` of `GET /api/app/team`. */
export const teamMember = (over: Record<string, unknown> = {}) => ({
  id: 'u-rina',
  name: 'Rina Wulandari',
  jobTitle: 'UI Designer',
  image: null,
  isSelf: false,
  projects: [{ id: 'p-atlas', name: 'Atlas', role: 'member' }],
  availability: null,
  ...over,
});

/** A whole `GET /api/app/team` body. */
export const teamBody = (
  people: ReturnType<typeof teamMember>[],
  over: { total?: number; summary?: Record<string, unknown> } = {},
) => ({
  summary: { people: over.total ?? people.length, projects: 1, ...over.summary },
  people,
  total: over.total ?? people.length,
});

/** A whole `GET /api/app/team/:userId` body. */
export const personBody = (over: Record<string, unknown> = {}) => ({
  person: {
    id: 'u-rina',
    name: 'Rina Wulandari',
    jobTitle: 'UI Designer',
    department: 'Product',
    email: 'rina@kantor.id',
  },
  projects: [{ id: 'p-atlas', name: 'Atlas', role: 'member' }],
  availability: null,
  tasksVisible: true,
  tasks: [],
  ...over,
});

/** Fields every Trash row carries. */
const trashTiming = (over: Record<string, unknown> = {}) => ({
  deletedAt: '2026-10-06T09:30:00.000Z',
  restorableUntil: '2026-11-05',
  daysLeft: 12,
  deletedBy: { id: 'u-nico', name: 'Nico' },
  can: { restore: true as const },
  ...over,
});

export const trashProject = (over: Record<string, unknown> = {}) => ({
  kind: 'project' as const,
  id: 'p-old',
  name: 'Old Client Portal',
  cascade: { tasks: 5, events: 1 },
  ...trashTiming(),
  ...over,
});

export const trashTask = (over: Record<string, unknown> = {}) => ({
  kind: 'task' as const,
  id: 't-21',
  number: 21,
  title: 'Duplicate login test',
  project: { id: 'p-atlas', name: 'Atlas' },
  blockedBy: null,
  projectInTrash: false,
  ...trashTiming(),
  ...over,
});

export const trashEvent = (over: Record<string, unknown> = {}) => ({
  kind: 'event' as const,
  id: 'e-test',
  title: 'Test meeting',
  eventKind: 'meeting',
  startsAt: '2026-10-06T02:00:00.000Z',
  project: null,
  blockedBy: null,
  projectInTrash: false,
  ...trashTiming(),
  ...over,
});

/** A whole `GET /api/app/trash` body; `counts` does not follow the `kind` filter. */
export const trashBody = (
  items: Record<string, unknown>[],
  over: { total?: number; counts?: Record<string, number> } = {},
) => ({
  items,
  total: over.total ?? items.length,
  page: 1,
  limit: 25,
  counts: over.counts ?? { project: 1, task: 1, event: 1 },
});
