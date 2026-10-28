// Projects answers as `GET /api/app/projects*` send them (`server/project/project.dto.ts`, `project-plan.dto.ts`,
// `project-activity.dto.ts`). The server's own sentences (condition reason, activity text) are Indonesian, as they
// arrive. Today is the test clock's Oct 7, 2026. test-only
import type {
  ExtensionsWire,
  ProjectActivityWire,
  ProjectDetailWire,
  ProjectListItemWire,
  ProjectMembersWire,
  ProjectPlanWire,
  ProjectsPageWire,
} from '@/data/projects.wire';

export const atlasItem = (over: Partial<ProjectListItemWire> = {}): ProjectListItemWire => ({
  id: 'p-atlas',
  name: 'Atlas Project',
  status: 'active',
  priority: 'high',
  lead: { id: 'u-nico', name: 'Nico Pratama' },
  startDate: '2026-09-01',
  dueDate: '2026-10-31',
  progress: { done: 7, total: 10, percent: 70 },
  condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  myRole: 'manager',
  ...over,
});

export const sinarItem = (over: Partial<ProjectListItemWire> = {}): ProjectListItemWire =>
  atlasItem({
    id: 'p-sinar',
    name: 'Sinar Rebrand',
    status: 'on_hold',
    lead: null,
    dueDate: null,
    progress: { done: 0, total: 0, percent: null },
    condition: null,
    myRole: 'member',
    ...over,
  });

/** One list page; `total` defaults to the rows given. */
export const page = (
  items: ProjectListItemWire[],
  { total = items.length, n = 1, limit = 25 }: { total?: number; n?: number; limit?: number } = {},
): ProjectsPageWire => ({ items, total, page: n, limit });

/** `count` rows p-1…p-count, for paging. */
export const many = (count: number, from = 1): ProjectListItemWire[] =>
  Array.from({ length: count }, (_, i) =>
    atlasItem({ id: `p-${from + i}`, name: `Project ${from + i}` }),
  );

export const atlasDetail = (over: Partial<ProjectDetailWire> = {}): ProjectDetailWire => ({
  ...atlasItem(),
  description: 'Ganti situs lama',
  originalDueDate: '2026-10-20',
  taskCounts: { active: 6, overdue: 1, live: 10 },
  can: { update: true, trash: true, createTask: true, manageKinds: true },
  extensionCount: 1,
  lastExtension: null,
  conditionOverride: null,
  ...over,
});

export const atlasMembers = (): ProjectMembersWire => ({
  items: [
    {
      userId: 'u-nico',
      name: 'Nico Pratama',
      image: null,
      jobTitle: 'Project Manager',
      role: 'manager',
      isLead: true,
      joinedAt: '2026-09-01T02:00:00.000Z',
    },
    {
      userId: 'u-rina',
      name: 'Rina Wulandari',
      image: null,
      jobTitle: null,
      role: 'member',
      isLead: false,
      joinedAt: '2026-09-02T02:00:00.000Z',
    },
  ],
});

const design = {
  id: 'ph-1',
  name: 'Design',
  position: 0,
  startDate: '2026-09-01',
  endDate: '2026-09-24',
  status: 'done' as const,
  taskCount: 4,
  doneCount: 4,
};
const build = {
  id: 'ph-2',
  name: 'Build',
  position: 1,
  startDate: '2026-09-25',
  endDate: null,
  status: 'in_progress' as const,
  taskCount: 4,
  doneCount: 1,
};
const launch = {
  id: 'ph-3',
  name: 'Launch',
  position: 2,
  startDate: null,
  endDate: null,
  status: 'not_started' as const,
  taskCount: 0,
  doneCount: 0,
};
const beta = {
  id: 'm-2',
  phaseId: 'ph-2',
  title: 'Beta ready',
  dueDate: '2026-10-12',
  reachedAt: null,
};

export const atlasPlan = (): ProjectPlanWire => ({
  phases: [design, build, launch],
  milestones: [
    {
      id: 'm-1',
      phaseId: 'ph-1',
      title: 'Design signed off',
      dueDate: '2026-09-24',
      reachedAt: '2026-09-23T09:00:00.000Z',
    },
    beta,
    { id: 'm-3', phaseId: null, title: 'Go live', dueDate: '2026-10-31', reachedAt: null },
  ],
  currentPhase: build,
  nextMilestone: beta,
});

export const emptyPlan = (): ProjectPlanWire => ({
  phases: [],
  milestones: [],
  currentPhase: null,
  nextMilestone: null,
});

export const atlasActivity = (): ProjectActivityWire => ({
  items: [
    {
      id: 'a-1',
      action: 'task.completed',
      text: 'Rina menyelesaikan #12 Hero section',
      actorName: 'Rina Wulandari',
      createdAt: '2026-10-06T03:00:00.000Z',
    },
  ],
  nextCursor: null,
});

export const atlasExtensions = (): ExtensionsWire => ({
  items: [
    {
      id: 'x-1',
      oldDueDate: '2026-10-20',
      newDueDate: '2026-10-31',
      reasonCategory: 'dependency',
      reason: 'Menunggu API vendor',
      extendedByName: 'Nico Pratama',
      createdAt: '2026-10-02T03:00:00.000Z',
    },
  ],
  count: 1,
  total: 1,
  limit: 5,
});

/** A task-list page as the Overview's attention reads ask for it. */
export const taskPage = (
  items: { id: string; number: number; title: string; dueDate: string | null; name?: string }[],
) => ({
  items: items.map(({ name, ...t }) => ({
    ...t,
    status: 'in_progress',
    assignee: name ? { id: `u-${name}`, name } : null,
  })),
  nextCursor: null,
});

export const notFound = {
  status: 404,
  body: { error: 'Proyek tidak ditemukan.', code: 'NOT_FOUND' },
};

/** Every read of the Atlas detail, in the order serveAuth must try them (the detail path is a prefix of the rest). */
export const atlasRoutes = (detail: ProjectDetailWire = atlasDetail()) => ({
  '/api/app/projects/p-atlas/members': { body: atlasMembers() },
  '/api/app/projects/p-atlas/plan': { body: atlasPlan() },
  '/api/app/projects/p-atlas/activity': { body: atlasActivity() },
  '/api/app/projects/p-atlas/extensions': { body: atlasExtensions() },
  '/api/app/projects/p-atlas': { body: detail },
  '/api/app/tasks?': (url: string) =>
    url.includes('due=overdue')
      ? {
          body: taskPage([
            { id: 't-12', number: 12, title: 'Hero section', dueDate: '2026-10-05', name: 'Rina' },
          ]),
        }
      : url.includes('status=in_review')
        ? {
            body: taskPage([
              // Overdue and in review: listed once, as overdue.
              {
                id: 't-12',
                number: 12,
                title: 'Hero section',
                dueDate: '2026-10-05',
                name: 'Rina',
              },
              { id: 't-17', number: 17, title: 'Copy review', dueDate: null },
            ]),
          }
        : { body: taskPage([]) },
});

export const query = (url: string) => Object.fromEntries(new URL(url).searchParams);
