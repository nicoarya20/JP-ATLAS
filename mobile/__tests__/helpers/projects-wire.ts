// `/api/app/projects*` bodies, field for field as the server sends them, built from overrides so a
// test names only what it is about. Mirrors src/data/projects.api.types.ts.
//
// The ids and names are the prototype's ("atlas", "Atlas Project", Nico as Lead), so assertions
// ported from Phase 1 still read about the same projects even though the rows now arrive over the
// wire instead of out of projects.store.
import type {
  WireActivityPage,
  WireExtension,
  WireExtensionList,
  WireMemberItem,
  WireMemberList,
  WirePhase,
  WirePickerList,
  WireProjectDetail,
  WireProjectListItem,
  WireProjectPage,
  WireProjectPlan,
  WireWhoami,
} from '@/data/projects.api.types';

import { TEST_CLOCK } from './session-fixtures';

/** The signed-in account of the project tests; matches APPROVED_USER in session-fixtures. */
export const ME = { id: 'u-nico', name: 'Nico Arya' };
/** A second member, the one the Members tab tests change and remove. */
export const DODI = { id: 'u-dodi', name: 'Dodi Pratama' };

export const wireProgress = (done = 7, total = 10, percent: number | null = 70) => ({
  done,
  total,
  percent,
});

/** One row of `GET /api/app/projects`. */
export function wireListItem(over: Partial<WireProjectListItem> = {}): WireProjectListItem {
  return {
    id: 'atlas',
    name: 'Atlas Project',
    status: 'active',
    priority: 'high',
    lead: { id: ME.id, name: ME.name },
    startDate: '2026-09-01',
    dueDate: '2026-10-31',
    progress: wireProgress(),
    condition: { level: 'on_track', reason: null },
    myRole: 'manager',
    ...over,
  };
}

/** `GET /api/app/projects/:id`. `can` is spread last so a test can hand over an empty one. */
export function wireDetail(over: Partial<WireProjectDetail> = {}): WireProjectDetail {
  return {
    ...wireListItem(),
    description: 'The attendance rebuild.',
    originalDueDate: '2026-10-20',
    taskCounts: { active: 3, overdue: 1, live: 5 },
    can: { update: true, trash: true, createTask: true, manageKinds: true },
    extensionCount: 1,
    lastExtension: null,
    conditionOverride: null,
    ...over,
  };
}

/** A page of the list, with the real `total` the server sends (not the rows loaded so far). */
export function wirePage(
  items: readonly WireProjectListItem[],
  over: Partial<WireProjectPage> = {},
): WireProjectPage {
  return { items: [...items], total: items.length, page: 1, limit: 20, ...over };
}

export function wireMember(over: Partial<WireMemberItem> = {}): WireMemberItem {
  return {
    userId: ME.id,
    name: ME.name,
    image: null,
    jobTitle: 'Product Designer',
    role: 'manager',
    isLead: true,
    joinedAt: `${TEST_CLOCK.today}T01:00:00.000Z`,
    ...over,
  };
}

/** The Lead plus one plain member: the shape the Members tab tests are written against. */
export const DEFAULT_MEMBERS: readonly WireMemberItem[] = [
  wireMember(),
  wireMember({
    userId: DODI.id,
    name: DODI.name,
    jobTitle: 'Backend Engineer',
    role: 'member',
    isLead: false,
  }),
];

export const wireMembers = (
  items: readonly WireMemberItem[] = DEFAULT_MEMBERS,
): WireMemberList => ({ items: [...items] });

export function wirePhase(over: Partial<WirePhase> = {}): WirePhase {
  return {
    id: 'ph-1',
    projectId: 'atlas',
    name: 'Discovery',
    description: null,
    position: 1,
    startDate: '2026-09-01',
    endDate: '2026-09-24',
    status: 'done',
    startedAt: '2026-09-01T01:00:00.000Z',
    finishedAt: '2026-09-24T09:00:00.000Z',
    taskCount: 4,
    doneCount: 4,
    ...over,
  };
}

export function wirePlan(over: Partial<WireProjectPlan> = {}): WireProjectPlan {
  const phases = over.phases ?? [
    wirePhase(),
    wirePhase({
      id: 'ph-2',
      name: 'Build',
      position: 2,
      startDate: '2026-09-25',
      endDate: '2026-10-20',
      status: 'in_progress',
      finishedAt: null,
      taskCount: 6,
      doneCount: 3,
    }),
  ];
  return {
    phases,
    milestones: [],
    nextMilestone: null,
    currentPhase: phases.find((p) => p.status === 'in_progress') ?? null,
    ...over,
  };
}

export function wireExtension(over: Partial<WireExtension> = {}): WireExtension {
  return {
    id: 'x-1',
    projectId: 'atlas',
    oldDueDate: '2026-10-20',
    newDueDate: '2026-10-31',
    reasonCategory: 'scope_change',
    reason: 'Client asked for the report screen.',
    extendedBy: ME.id,
    extendedByName: ME.name,
    createdAt: '2026-10-01T02:00:00.000Z',
    ...over,
  };
}

export const wireExtensions = (
  items: readonly WireExtension[] = [wireExtension()],
): WireExtensionList => ({ items: [...items], count: items.length, total: items.length, limit: 10 });

export const wireActivity = (items: WireActivityPage['items'] = []): WireActivityPage => ({
  items,
  nextCursor: null,
});

export const wirePicker = (): WirePickerList => ({
  items: [
    { id: DODI.id, name: DODI.name, jobTitle: 'Backend Engineer', image: null },
    { id: 'u-lea', name: 'Lea Hartono', jobTitle: 'QA', image: null },
  ],
});

/** `GET /api/app/whoami`; `createProject` is what decides whether New project is offered (A-17). */
export const wireWhoami = (over: Partial<WireWhoami> = {}): WireWhoami => ({
  userId: ME.id,
  name: ME.name,
  role: 'project_manager',
  caps: { createProject: true, createEvent: true, dashboard: false, dev: false },
  ...over,
});

/** An empty task page, for the project's Tasks tab and its three attention queries. */
export const wireTaskPage = () => ({
  items: [],
  nextCursor: null,
  caps: { createTask: true },
});
