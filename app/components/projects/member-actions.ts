/**
 * Which member actions a row shows and why one is switched off. The server decides who may manage
 * members (`can.update`); this only mirrors its 409/422 cases (last manager, Lead, self) so the
 * button is disabled with a written reason instead of failing after a click.
 */
import type { ProjectMemberRole } from '@server/pm/enums';
import type { ProjectMemberItem } from '@server/project/project.dto';
import { MEMBER_BLOCK_COPY } from './members.copy';

/** Roles that count toward "at least one manager"; a lookup on the row's data, not on the caller's role. */
const COUNTS_AS_MANAGER: Record<ProjectMemberRole, boolean> = {
  manager: true,
  member: false,
  viewer: false,
};

/** One action: absent when the caller may not manage members, otherwise enabled or blocked with a reason. */
export type MemberAction = { blocked: string | null } | null;
export type MemberRowActions = { changeRole: MemberAction; remove: MemberAction };

export type MemberContext = {
  /** `can.update === true` from the server; managing members is part of managing the project. */
  canManage: boolean;
  /** The signed-in person's id. */
  meId: string;
  /** How many members are managers right now. */
  managerCount: number;
};

/** Reason shared by both actions: the row is the Lead, or the only manager left. */
function managerBlock(m: ProjectMemberItem, ctx: MemberContext): string | null {
  if (!COUNTS_AS_MANAGER[m.role]) return null;
  if (ctx.managerCount <= 1) return MEMBER_BLOCK_COPY.lastManager;
  return m.isLead ? MEMBER_BLOCK_COPY.isLead : null;
}

export function memberActions(m: ProjectMemberItem, ctx: MemberContext): MemberRowActions {
  if (!ctx.canManage) return { changeRole: null, remove: null };
  const block = managerBlock(m, ctx);
  return {
    changeRole: { blocked: block },
    remove: { blocked: m.userId === ctx.meId ? MEMBER_BLOCK_COPY.self : block },
  };
}

export const countManagers = (members: readonly ProjectMemberItem[]) => managersOf(members).length;

/** The members who are managers: the only people who may become the Lead. */
export const managersOf = <T extends Pick<ProjectMemberItem, 'role'>>(members: readonly T[]) =>
  members.filter((m) => COUNTS_AS_MANAGER[m.role]);
