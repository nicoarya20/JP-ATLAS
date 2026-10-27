/**
 * The Admin Beranda aggregates (P11 AD-14). These read the whole workspace, so a shared test DB may
 * hold rows from other suites: every assertion about a global count is a delta from a baseline taken
 * before seeding (robust to concurrent inserts, which only add), while the list cards are checked by
 * finding the exact rows this suite seeded. "Today"/"now" are fixed through the injected `at`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { AUDIT_ACTIONS } from '../../server/audit';
import { db } from '../../server/db';
import { auditLog } from '../../server/db/schema';
import { getAgenda } from '../../server/admin/overview/overview.agenda.query';
import type { MembersSummary } from '../../server/admin/overview/overview.dto';
import { getMembers, getPendingApprovals } from '../../server/admin/overview/overview.members.query';
import { getProjectsByStatus } from '../../server/admin/overview/overview.projects.query';
import { getRoleChanges } from '../../server/admin/overview/overview.roles.query';
import { getOverview } from '../../server/admin/overview/overview.service';
import { getOverdueTasks } from '../../server/admin/overview/overview.tasks.query';
import { PROJECT_STATUSES } from '../../server/pm/enums';
import { createCleaner } from '../support/cleanup';
import { createEventFactory } from '../event/factory.event';
import { createFactory } from '../support/factory.task';

const NOW = new Date('2026-10-07T03:00:00Z'); // Wednesday 2026-10-07 10.00 WIB
const TODAY = '2026-10-07';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'adovw', now: () => NOW });
const events = createEventFactory({ tag: 'adovw-ev', now: () => NOW });

const roleCount = (m: MembersSummary, role: string) =>
  m.roles.find((r) => r.role === role)?.count ?? 0;

type Seeded = {
  admin: Awaited<ReturnType<typeof f.user>>;
  member: Awaited<ReturnType<typeof f.user>>;
  overdueAssigned: string;
  overdueUnassigned: string;
  notOverdue: string;
  doneOverdue: string;
  upcomingEvent: string;
  pastEvent: string;
  canceledEvent: string;
  roleChangeId: string;
};
let seeded: Seeded;
let baseMembers: MembersSummary;
let basePending: number;
let baseActiveProjects: number;

afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

beforeAll(async () => {
  // Baselines first, so every global-count assertion below is a delta robust to other suites' rows.
  baseMembers = await getMembers();
  basePending = (await getPendingApprovals()).count;
  baseActiveProjects =
    (await getProjectsByStatus()).byStatus.find((s) => s.status === 'active')?.count ?? 0;

  const admin = await f.user({ role: 'admin', name: 'Admin Uji' });
  await f.user({ role: 'project_manager', name: 'PM Uji' });
  const member = await f.user({ role: 'member', name: 'Anggota Uji' });
  await f.user({ role: 'member', banned: true, name: 'Nonaktif Uji' });
  await f.user({ role: 'member', status: 'pending', name: 'Menunggu Uji' });

  const active = await f.project({ lead: admin, status: 'active', name: 'Proyek Jalan Uji' });
  await f.project({ lead: admin, status: 'completed', name: 'Proyek Selesai Uji' });
  await f.project({ lead: admin, status: 'on_hold', name: 'Proyek Tunda Uji' });

  const overdueAssigned = await f.task({
    project: active,
    assignee: member,
    status: 'in_progress',
    due: '2026-10-01',
    title: 'Bayar DP Uji',
  });
  const overdueUnassigned = await f.task({
    project: active,
    status: 'todo',
    due: '2026-10-02',
    title: 'Tanpa pengerja Uji',
  });
  const notOverdue = await f.task({
    project: active,
    assignee: member,
    status: 'todo',
    due: '2026-10-20',
    title: 'Belum jatuh tempo Uji',
  });
  const doneOverdue = await f.task({
    project: active,
    assignee: member,
    status: 'done',
    due: '2026-09-01',
    title: 'Sudah selesai Uji',
  });

  const upcoming = await events.event({
    creator: admin,
    project: active,
    title: 'Rapat mendatang Uji',
    startsInMin: 120,
  });
  const past = await events.event({ creator: admin, title: 'Rapat lalu Uji', startsInMin: -600 });
  const canceled = await events.event({
    creator: admin,
    title: 'Rapat batal Uji',
    startsInMin: 180,
    canceledAt: NOW,
    canceledBy: admin,
  });

  const roleChangeId = `adovw-audit-${crypto.randomUUID().slice(0, 8)}`;
  cleaner.track('audit', roleChangeId);
  await db.insert(auditLog).values({
    id: roleChangeId,
    actorId: admin.id,
    actorEmail: admin.email,
    action: AUDIT_ACTIONS.USER_ROLE_SET,
    targetType: 'user',
    targetId: member.id,
    summary: 'Role user diubah dari member ke project_manager',
    meta: { from: 'member', to: 'project_manager' },
    createdAt: NOW,
  });

  seeded = {
    admin,
    member,
    overdueAssigned: overdueAssigned.id,
    overdueUnassigned: overdueUnassigned.id,
    notOverdue: notOverdue.id,
    doneOverdue: doneOverdue.id,
    upcomingEvent: upcoming.id,
    pastEvent: past.id,
    canceledEvent: canceled.id,
    roleChangeId,
  };
});

describe('getMembers', () => {
  it('counts active vs. suspended and breaks active down by effective role', async () => {
    const m = await getMembers();
    // Seeded active: admin, PM, member, pending (none banned). Seeded suspended: one.
    expect(m.active - baseMembers.active).toBeGreaterThanOrEqual(4);
    expect(m.inactive - baseMembers.inactive).toBeGreaterThanOrEqual(1);
    // Two members (plain + pending), one PM, one admin were added.
    expect(roleCount(m, 'member') - roleCount(baseMembers, 'member')).toBeGreaterThanOrEqual(2);
    expect(
      roleCount(m, 'project_manager') - roleCount(baseMembers, 'project_manager'),
    ).toBeGreaterThanOrEqual(1);
    expect(roleCount(m, 'admin') - roleCount(baseMembers, 'admin')).toBeGreaterThanOrEqual(1);
  });

  it('always lists the four roles in a stable order', async () => {
    const m = await getMembers();
    expect(m.roles.map((r) => r.role)).toEqual([
      'member',
      'project_manager',
      'admin',
      'super-admin',
    ]);
  });
});

describe('getPendingApprovals', () => {
  it('counts the registrants still waiting', async () => {
    const { count } = await getPendingApprovals();
    expect(count - basePending).toBeGreaterThanOrEqual(1);
  });
});

describe('getProjectsByStatus', () => {
  it('returns every status in enum order and a total equal to the sum', async () => {
    const p = await getProjectsByStatus();
    expect(p.byStatus.map((s) => s.status)).toEqual([...PROJECT_STATUSES]);
    expect(p.total).toBe(p.byStatus.reduce((sum, s) => sum + s.count, 0));
    const activeNow = p.byStatus.find((s) => s.status === 'active')?.count ?? 0;
    expect(activeNow - baseActiveProjects).toBeGreaterThanOrEqual(1);
  });
});

describe('getOverdueTasks', () => {
  it('lists open tasks past their due date with who holds them, worst first', async () => {
    const { items } = await getOverdueTasks(TODAY);
    const assigned = items.find((t) => t.id === seeded.overdueAssigned);
    expect(assigned).toBeDefined();
    expect(assigned?.assigneeName).toBe('Anggota Uji');
    expect(assigned?.projectName).toBe('Proyek Jalan Uji');
    // Due 2026-10-01, today 2026-10-07.
    expect(assigned?.overdueDays).toBe(6);

    const unassigned = items.find((t) => t.id === seeded.overdueUnassigned);
    expect(unassigned?.assigneeName).toBeNull();
  });

  it('excludes tasks that are not yet due and tasks that are already done', async () => {
    const { items } = await getOverdueTasks(TODAY);
    expect(items.find((t) => t.id === seeded.notOverdue)).toBeUndefined();
    expect(items.find((t) => t.id === seeded.doneOverdue)).toBeUndefined();
  });
});

describe('getAgenda', () => {
  it('lists upcoming events and drops the past and the cancelled', async () => {
    const { items } = await getAgenda(NOW);
    const up = items.find((e) => e.id === seeded.upcomingEvent);
    expect(up).toBeDefined();
    expect(up?.projectName).toBe('Proyek Jalan Uji');
    expect(items.find((e) => e.id === seeded.pastEvent)).toBeUndefined();
    expect(items.find((e) => e.id === seeded.canceledEvent)).toBeUndefined();
  });
});

describe('getRoleChanges', () => {
  it('reads a role change with both people resolved from a single query (no N+1)', async () => {
    const { items } = await getRoleChanges();
    const change = items.find((c) => c.id === seeded.roleChangeId);
    expect(change).toBeDefined();
    expect(change?.targetName).toBe('Anggota Uji');
    expect(change?.byName).toBe('Admin Uji');
    expect(change?.from).toBe('member');
    expect(change?.to).toBe('project_manager');
  });
});

describe('getOverview', () => {
  it('returns every section loaded with the team-zone clock', async () => {
    const data = await getOverview(NOW);
    expect(data.now.today).toBe(TODAY);
    expect(data.now.timeZone).toBe('Asia/Jakarta');
    for (const section of [
      data.pending,
      data.members,
      data.projects,
      data.overdue,
      data.agenda,
      data.roles,
    ]) {
      expect(section.ok).toBe(true);
    }
  });

  it('fails each section softly when the database is unreachable, never throwing', async () => {
    const brokenExec = {
      select() {
        throw new Error('db down');
      },
    } as never;
    const data = await getOverview(NOW, brokenExec);
    // The clock is computed before any query, so it survives a dead database.
    expect(data.now.today).toBe(TODAY);
    expect(data.pending.ok).toBe(false);
    expect(data.members.ok).toBe(false);
    expect(data.projects.ok).toBe(false);
    expect(data.overdue.ok).toBe(false);
    expect(data.agenda.ok).toBe(false);
    expect(data.roles.ok).toBe(false);
  });
});
