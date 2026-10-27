/**
 * The Members tab as the screen shows it, and the picker the "+ Member" and Lead controls read.
 *
 * Three things changed from the prototype and all three are the point of this wave:
 *
 * - **Identity is `userId`.** A member is matched to the signed-in account through `samePerson()`
 *   (K4), never by first name; the row's own key is its `userId`, which is also what the write
 *   routes take. Two people called Budi used to collide silently.
 * - **Permissions are the server's.** `can.update` decides whether the role select and Remove are
 *   drawn at all. The old client-side guards — the last manager, the Lead, removing yourself —
 *   are gone: those are decided when the write lands (`server/project/member.service.ts`) and the
 *   screen shows the sentence the server sends back.
 * - **The sub line is the job title alone.** The prototype showed "UI Designer · Product", but
 *   `ProjectMemberItem` carries no `department` (GAP A-9), so the half that is real is shown and
 *   the half that is not is left out.
 */
import { type CapState, capState } from './projects.api.map';
import type {
  WireMemberItem,
  WireMemberList,
  WirePickerList,
  WireProjectCaps,
} from './projects.api.types';
import { roleWord } from './projects.api.values';
import type { ProjectRole } from './sample/projects.extra';
import { samePerson, viewer } from './viewer';

/** Project roles a member can have, in the order the select offers them. */
export const PROJECT_ROLES_LIST: readonly ProjectRole[] = ['Manager', 'Member', 'Viewer'];

export type MemberCardView = {
  /** The identity, and what every member write is addressed to. */
  userId: string;
  /** Display name as the server knows it. */
  full: string;
  /** Profile photo, or null for the initials avatar (B-11). */
  image: string | null;
  /** The job title, or '' when the profile has none. */
  sub: string;
  role: ProjectRole;
  you: boolean;
  lead: boolean;
};

export type MembersView = {
  /** "4 members", or null before the list arrives. */
  count: string | null;
  cards: MemberCardView[];
  /** The display name of the only Manager when that Manager is also the Lead; else null. */
  onlyManager: string | null;
  /** How "+ Member", the role select and Remove must be drawn (`can.update`). */
  manage: CapState;
};

/** One member row as a card. */
function cardOf(item: WireMemberItem): MemberCardView {
  return {
    userId: item.userId,
    full: item.name,
    image: item.image,
    sub: item.jobTitle ?? '',
    role: roleWord(item.role),
    you: samePerson(item.userId, viewer()),
    lead: item.isLead,
  };
}

/**
 * The Members tab of one project.
 *
 * `onlyManager` is read off the rows rather than asked for: the note it drives ("…so they can't be
 * removed") is about what the server will refuse, and the rows carry everything needed to see it
 * coming. When it is wrong anyway, the refusal arrives with the server's own sentence.
 */
export function membersView(
  list: WireMemberList | null,
  can: WireProjectCaps | undefined,
): MembersView {
  const items = list?.items ?? [];
  const managers = items.filter((m) => m.role === 'manager');
  const lead = managers.length === 1 ? managers[0] : undefined;
  return {
    count: list ? `${items.length} member${items.length === 1 ? '' : 's'}` : null,
    cards: items.map(cardOf),
    onlyManager: lead?.isLead ? lead.name : null,
    manage: capState(can, 'update'),
  };
}

/** One option of a member or Lead picker. */
export type PickerOption = { value: string; label: string; sub: string };

/** The people a project may add, from `GET /api/app/team/picker?projectId=` (already a member is excluded server-side). */
export const pickerOptions = (list: WirePickerList | null): PickerOption[] =>
  (list?.items ?? []).map((p) => ({ value: p.id, label: p.name, sub: p.jobTitle ?? '' }));

/**
 * The Leads a project may hand over to: its own Managers. The server checks this too — the route
 * refuses a non-manager — so this only keeps the select from offering a choice it knows will fail.
 */
export const leadOptions = (list: WireMemberList | null): PickerOption[] =>
  (list?.items ?? [])
    .filter((m) => m.role === 'manager')
    .map((m) => ({ value: m.userId, label: m.name, sub: m.jobTitle ?? '' }));
