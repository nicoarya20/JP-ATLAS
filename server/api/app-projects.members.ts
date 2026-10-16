/**
 * Project member routes (`/api/app/projects/:id/members`): the list, and add, change role and
 * remove (S1-04). Writes are session-only (`PM_KEY_DENY`) and there is no "leave" route (D3).
 */
import { Elysia, t } from 'elysia';
import { PROJECT_MEMBER_ROLES } from '../pm/enums';
import { fail } from '../pm/respond';
import {
  addMember,
  changeMemberRole,
  type MemberChange,
  removeMember,
} from '../project/member.service';
import { toPrincipal } from '../project/membership.query';
import { listProjectMembers } from '../project/project.query';
import type { WriteResult } from '../project/project.service';
import { IdParam, oneOf } from './app-common';
import { appContext } from './app-context';

const strict = { additionalProperties: false } as const;
const role = oneOf(PROJECT_MEMBER_ROLES);
const MemberParams = t.Object({ ...IdParam.properties, userId: t.String({ minLength: 1 }) });

export const projectMembersApi = new Elysia({ prefix: '/projects' })
  .use(appContext)
  .derive(({ actor, status }) => ({
    /** Answers a member write with the fresh member list, or its uniform error body. */
    async reply(projectId: string, result: WriteResult<MemberChange>, created = false) {
      if (!result.ok) return fail(status, result.code, { error: result.error });
      const items = await listProjectMembers(toPrincipal(actor), projectId);
      if (!items) return fail(status, 'NOT_FOUND');
      return created ? status(201, { items }) : { items };
    },
  }))
  /** Members of a project (managers first); a project the caller cannot see answers 404. */
  .get(
    '/:id/members',
    async ({ actor, params, status }) => {
      const items = await listProjectMembers(toPrincipal(actor), params.id);
      return items ? { items } : fail(status, 'NOT_FOUND');
    },
    { params: IdParam },
  )
  /** Add an approved person with a role (managers, Admin); an existing member is a 422. */
  .post(
    '/:id/members',
    async ({ actor, body, params, reply }) =>
      reply(params.id, await addMember(toPrincipal(actor), params.id, body), true),
    { params: IdParam, body: t.Object({ userId: t.String({ minLength: 1 }), role }, strict) },
  )
  /** Change a member's role; the last manager and the Lead stay managers (409). */
  .patch(
    '/:id/members/:userId',
    async ({ actor, body, params, reply }) =>
      reply(
        params.id,
        await changeMemberRole(toPrincipal(actor), params.id, params.userId, body.role),
      ),
    { params: MemberParams, body: t.Object({ role }, strict) },
  )
  /** Remove a member (not yourself, not the last manager, not the Lead). */
  .delete(
    '/:id/members/:userId',
    async ({ actor, params, reply }) =>
      reply(params.id, await removeMember(toPrincipal(actor), params.id, params.userId)),
    { params: MemberParams },
  );
