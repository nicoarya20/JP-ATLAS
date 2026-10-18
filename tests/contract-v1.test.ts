/**
 * Public-surface gate for `contract-v1`. Snapshots are literals on purpose: changing a frozen
 * export, route or menu entry must appear as an edit here so a reviewer sees it
 * (change protocol: docs/decisions/0002-contract-v1.md). Adding a name is allowed, but needs its line.
 */
import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import routes from '../app/routes';
import { NAV } from '../app/routes/app/layout';

const ROOT = path.join(import.meta.dir, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
const words = (text: string) => text.split(/\s+/).filter(Boolean);

/** Export names per frozen file, sorted (types and values together). */
const EXPORT_SNAPSHOT: Record<string, string> = {
  'server/access/account-status.rules.ts':
    'ACCOUNT_TRANSITIONS APPROVAL_STATUSES AccountTransitionInput ApprovalStatus REJECT_REASON_MAX REJECT_REASON_MIN canTransitionAccount isValidRejectReason',
  'server/access/capabilities.ts':
    'AppCaps CapValue Caps EVENT_CAP_KEYS EventCapKey EventCaps PROJECT_CAP_KEYS ProjectCapKey ProjectCaps TASK_CAP_KEYS TaskCapKey TaskCaps Verdict appCaps buildCaps capMessage capOf eventCaps projectCaps taskCaps',
  'server/access/decision.ts': 'DENY_CODES DENY_UI Decision DenyCode DenyUi allow deny',
  'server/access/event.policy.ts':
    'EventDecision NOT_VISIBLE canCancelEvent canCreateEvent canManageEvent canManageParticipants canRestoreEvent canTrashEvent canViewEvent canWriteNote eventLevel eventOpen',
  'server/access/level.ts': 'LEVELS LEVEL_RANK Level atLeast isPmOrAbove levelOf',
  'server/access/members.policy.ts':
    'LeadDecision LeadMustBeManager ManagerSetChange canChangeManagerSet canSetLead',
  'server/access/not-visible.ts': 'NotVisible NotVisibleCode notVisible',
  'server/access/project.policy.ts':
    'NOT_VISIBLE ProjectDecision ProjectListScope RequestedListScope canCreateProject canManageProject canRestoreProject canTrashProject canViewProject clampListScope matchesProjectScope projectListScope',
  'server/access/review.policy.ts':
    'ManagerInfo NoEligibleReviewer PickReviewerInput REVIEW_NOTE_MAX_LENGTH REVIEW_NOTE_MIN_LENGTH ReviewDecision ReviewerPick ReviewerPool canApproveTask canChangeReviewer canRequestReview canReturnTask pickReviewer reviewerCandidates',
  'server/access/rules.ts': 'ACCESS_RULES AccessRules',
  'server/access/task-flow.policy.ts':
    'CancelInput FlowAction FlowAllow FlowDecision FlowEffect PrimaryAction TASK_TRANSITIONS TaskTransition canCancelTask canCompleteTask canReopenTask canStartTask canUncancelTask canUnstartTask findTransition nextStatuses primaryAction',
  'server/access/task.policy.ts':
    'NeedsReviewOnCreate NotVisible TaskActor TaskDecision authorizeTask canComment canCreateTask canEditTask canManageKinds canToggleNeedsReview canViewTask guardTask resolveNeedsReviewOnCreate taskOpen',
  'server/access/team.policy.ts': 'LoadScope canSortByLoad loadScopeFor scopeCovers',
  'server/access/trash.policy.ts':
    'TrashItemCapKey TrashItemCaps TrashListScope canViewTrashItem trashItemCaps trashListScope',
  'server/access/types.ts':
    'EventSubject Membership Principal ProjectRole ProjectSubject TaskSubject',
  'server/access/user.policy.ts':
    'Principal UserTarget canActOnUser canInviteWithRole canManageUsers canSetUserRole',
  'server/metrics/condition.ts':
    'ConditionInput ConditionMilestone ConditionOverride ConditionReason ConditionResult ConditionTask activeOverride computeCondition formatConditionReason',
  'server/metrics/config.ts': 'METRICS',
  'server/metrics/dates.ts': 'IsoDate diffDays isoDateIn',
  'server/metrics/project.metrics.ts':
    'ElapsedResult MilestoneState ProgressResult elapsed milestoneState progress',
  'server/metrics/schedule.ts':
    'SCHEDULE_GROUPS ScheduleBounds ScheduleGroup scheduleBounds scheduleGroupOf',
  'server/metrics/task.metrics.ts':
    'ACTIVE_STATUSES TaskLabel TaskLabelContext ageDays isActive isOverdue isStale taskLabels',
  'server/metrics/trash.metrics.ts': 'isRestorable lastRestorableDate trashDaysLeft',
  'server/metrics/types.ts': 'IsoDate MetricsConfig TaskLabel TaskMetricsRow',
  'server/pm/enums.ts':
    // The EVENT_* tuples are additions by the S7 slice owner, allowed by 0002-contract-v1.md §2
    // ("menambah") and recorded as a written decision in 0003-contract-v1-event-urls.md.
    'APPROVAL_STATUSES ApprovalStatus EVENT_KINDS EVENT_LOCATION_TYPES EVENT_NOTE_STATUSES EVENT_REMINDER_OFFSETS_MIN EventKind EventLocationType EventNoteStatus EventReminderOffset PROJECT_CONDITIONS PROJECT_MEMBER_ROLES PROJECT_PRIORITIES PROJECT_STATUSES ProjectCondition ProjectMemberRole ProjectPriority ProjectStatus TASK_BASE_KINDS TASK_CANCEL_CATEGORIES TASK_STATUSES TEXT_SIZES TaskBaseKind TaskCancelCategory TaskStatus TextSize',
  'server/pm/errors.ts':
    'DENY_CODES DenyCode PM_API_CODES PM_ERRORS PmApiCode PmCode PmErrorEntry PmHttp isDenyCode',
  'server/pm/limits.ts':
    'DEFAULT_TASK_KINDS PAGE_LIMIT_DEFAULT PAGE_LIMIT_MAX PROJECT_DELETE_UI_ENABLED TASK_REVIEW_UI_ENABLED WRITE_RATE_MAX WRITE_RATE_WINDOW_SECONDS',
};

/** Shared files other lanes build on; only the integrator edits them after the freeze. */
const SHARED_FILES = words(`
  app/routes.ts app/routes/app/layout.tsx server/api/app.ts server/api/app-context.ts
  server/api/app-common.ts server/api-error.ts server/api-keys/scopes.ts server/api-keys/scopes.pm.ts
  server/db/rollback/0015_project_core.down.sql server/db/rollback/0016_task_core.down.sql
  docs/decisions/0002-contract-v1.md
`);

/**
 * The thirteen /app URLs: the eleven of X1 D4 (/app plus ten children), /app/trash (S1-18, user decision
 * 15 Oct 2026, option B) and /app/tasks/:number/edit (S2-13, "Ubah tugas"); both compatible additions, see 0002-contract-v1.md §6. /profile is outside /app/.
 */
const APP_URLS = words(`
  /app /app/projects /app/projects/new /app/projects/:projectId /app/projects/:projectId/tasks
  /app/projects/:projectId/members /app/projects/:projectId/settings /app/tasks /app/tasks/new
  /app/tasks/:number /app/tasks/:number/edit /app/settings /app/trash
`);

const DECLARATION =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|function\*?|abstract class|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
const NAMED_LIST = /^export\s+(?:type\s+)?\{([^}]*)\}/gms;

/** Exported names found by scanning text (readable snapshot, no compiler); `unread` counts other forms. */
function scanExports(source: string) {
  const names = new Set<string>();
  for (const m of source.matchAll(DECLARATION)) names.add(m[1] as string);
  for (const m of source.matchAll(NAMED_LIST)) {
    for (const part of (m[1] as string).split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop();
      if (name) names.add(name);
    }
  }
  const known = [...source.matchAll(DECLARATION)].length + [...source.matchAll(NAMED_LIST)].length;
  return { names: [...names].sort(), unread: [...source.matchAll(/^export\b/gm)].length - known };
}

type RouteEntry = { path?: string; children?: RouteEntry[] };

/** Absolute URL of every route with a path, joining nested paths (pathless layouts add nothing). */
function urlsOf(entries: RouteEntry[], base = ''): string[] {
  return entries.flatMap((e) => {
    const here = e.path ? `${base}/${e.path}`.replace(/\/+/g, '/') : base;
    return [...(e.path ? [here] : []), ...urlsOf(e.children ?? [], here)];
  });
}

describe('contract-v1 files', () => {
  it.each([...Object.keys(EXPORT_SNAPSHOT), ...SHARED_FILES])('%s exists', (file) => {
    expect(existsSync(path.join(ROOT, file))).toBe(true);
  });

  it.each(['server/access', 'server/metrics'])(
    '%s holds no file missing from the snapshot',
    (dir) => {
      const onDisk = readdirSync(path.join(ROOT, dir)).map((f) => `${dir}/${f}`);
      expect(onDisk.sort()).toEqual(
        Object.keys(EXPORT_SNAPSHOT).filter((f) => f.startsWith(`${dir}/`)),
      );
    },
  );
});

describe('contract-v1 export names', () => {
  it.each(Object.keys(EXPORT_SNAPSHOT))('%s exports exactly the snapshot', (file) => {
    const { names, unread } = scanExports(read(file));
    expect(names).toEqual(words(EXPORT_SNAPSHOT[file] as string).sort());
    expect(unread).toBe(0); // `export *` or a default export would hide names from the scan
  });

  it('scanner reads declarations, renamed type lists and flags other forms', () => {
    const src =
      'export const A = 1;\nexport type { B, type C as D } from "./x";\nexport * from "./y";';
    expect(scanExports(src)).toEqual({ names: ['A', 'B', 'D'], unread: 1 });
  });
});

describe('contract-v1 routes and menu', () => {
  const appUrls = urlsOf(routes as RouteEntry[]).filter(
    (u) => u === '/app' || u.startsWith('/app/'),
  );

  it('registers exactly thirteen /app URLs', () => {
    expect(appUrls).toHaveLength(13);
    expect(appUrls.sort()).toEqual([...APP_URLS].sort());
  });

  // Sampah joined the menu with its page (S1-18), before Pengaturan.
  it('keeps exactly five items in the /app menu', () => {
    expect(NAV.map((n) => n.to)).toEqual([
      '/app',
      '/app/projects',
      '/app/tasks',
      '/app/trash',
      '/app/settings',
    ]);
  });
});
