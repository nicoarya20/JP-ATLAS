/**
 * Server-only (loader of `/app/events/new`): which projects the Proyek select offers. The policy that
 * judges the save (`canCreateEvent`) judges the choices too, so a Pemantau, or a Project Manager who
 * only reads a project, is never offered one the server would answer 403 `NOT_MEMBER` for.
 */
import { canCreateEvent } from '@server/access/event.policy';
import type { Membership, Principal } from '@server/access/types';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ProjectOption } from './event-form';

export function eventProjectOptions(
  principal: Principal,
  projects: readonly ProjectListItem[],
  memberships: ReadonlyMap<string, Membership>,
): ProjectOption[] {
  return projects
    .filter(
      (p) =>
        canCreateEvent(
          principal,
          // The list only holds live projects, so none is in the Trash.
          {
            id: p.id,
            status: p.status,
            leadId: p.lead?.id ?? null,
            deletedAt: null,
            deletedBy: null,
          },
          memberships.get(p.id) ?? null,
        ).ok,
    )
    .map((p) => ({ value: p.id, label: p.name }));
}
