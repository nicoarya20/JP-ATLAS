/**
 * Wire shapes of `/api/app/projects*` as the server sends them (`server/project/project.dto.ts`,
 * `project-plan.dto.ts`, `project-activity.dto.ts`; map `docs/phase2-map-projects.md` §0). Only the
 * fields the app reads are named; text the server writes (`condition.reason`, activity `text`,
 * extension `reason`, error messages) is Indonesian and shown as it comes (K5).
 */
export type ProjectStatusWire = 'draft' | 'active' | 'on_hold' | 'completed' | 'canceled';
export type ProjectPriorityWire = 'low' | 'medium' | 'high' | 'critical';
export type ProjectRoleWire = 'manager' | 'member' | 'viewer';
export type ProjectConditionWire = 'on_track' | 'at_risk' | 'off_track';
export type PhaseStatusWire = 'not_started' | 'in_progress' | 'done';
export type ExtensionReasonWire = 'scope_change' | 'dependency' | 'resource' | 'other';
export type ProjectSortWire = 'due' | 'name' | 'recent';

export type ProjectListItemWire = {
  id: string;
  name: string;
  status: ProjectStatusWire;
  priority: ProjectPriorityWire;
  /** null when the Lead's account is gone (FK SET NULL). */
  lead: { id: string; name: string } | null;
  startDate: string | null;
  dueDate: string | null;
  progress: { done: number; total: number; percent: number | null };
  /** Only `active` projects have one. */
  condition: { level: ProjectConditionWire; reason: string | null } | null;
  myRole: ProjectRoleWire | null;
};

export type ProjectsPageWire = {
  items: ProjectListItemWire[];
  total: number;
  page: number;
  limit: number;
};

/** A capability: `true` = enabled, a deny code = shown disabled (`caps.messages.ts`), a missing key = hidden. */
export type CapValueWire = true | string;

export type ProjectCapsWire = Partial<
  Record<'update' | 'trash' | 'createTask' | 'manageKinds', CapValueWire>
>;

export type DeadlineExtensionWire = {
  id: string;
  oldDueDate: string;
  newDueDate: string;
  reasonCategory: ExtensionReasonWire;
  reason: string;
  extendedByName: string | null;
  createdAt: string;
};

export type ConditionOverrideWire = {
  condition: ProjectConditionWire;
  reason: string;
  setByName: string | null;
  expiresAt: string | null;
};

export type ProjectDetailWire = ProjectListItemWire & {
  description: string | null;
  originalDueDate: string | null;
  /** `live` = every task not in the Trash: what moving the project to the Trash takes along. */
  taskCounts: { active: number; overdue: number; live: number };
  can: ProjectCapsWire;
  extensionCount: number;
  lastExtension: DeadlineExtensionWire | null;
  conditionOverride: ConditionOverrideWire | null;
};

export type ProjectMemberWire = {
  userId: string;
  name: string;
  image: string | null;
  jobTitle: string | null;
  role: ProjectRoleWire;
  isLead: boolean;
  joinedAt: string;
};

export type ProjectMembersWire = { items: ProjectMemberWire[] };

export type PhaseWire = {
  id: string;
  name: string;
  position: number;
  startDate: string | null;
  endDate: string | null;
  status: PhaseStatusWire;
  taskCount: number;
  doneCount: number;
};

export type MilestoneWire = {
  id: string;
  phaseId: string | null;
  title: string;
  dueDate: string;
  /** ISO instant; null = not reached yet. */
  reachedAt: string | null;
};

export type ProjectPlanWire = {
  phases: PhaseWire[];
  milestones: MilestoneWire[];
  currentPhase: PhaseWire | null;
  nextMilestone: MilestoneWire | null;
};

export type ActivityItemWire = {
  id: string;
  action: string;
  /** Ready-made sentence (Indonesian, K5). */
  text: string;
  actorName: string | null;
  createdAt: string;
};

export type ProjectActivityWire = { items: ActivityItemWire[]; nextCursor: string | null };

export type ExtensionsWire = {
  items: DeadlineExtensionWire[];
  count: number;
  total: number;
  limit: number;
};
