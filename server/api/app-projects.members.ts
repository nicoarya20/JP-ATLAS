/** Project member read route (`GET /api/app/projects/:id/members`). Changing members comes in S1-04. */
import { Elysia } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { listProjectMembers } from '../project/project.query';
import { IdParam } from './app-common';
import { appContext } from './app-context';

export const projectMembersApi = new Elysia({ prefix: '/projects' })
  .use(appContext)
  /** Members of a project (managers first); a project the caller cannot see answers 404. */
  .get(
    '/:id/members',
    async ({ actor, params, status }) => {
      const items = await listProjectMembers(toPrincipal(actor), params.id);
      return items ? { items } : fail(status, 'NOT_FOUND');
    },
    { params: IdParam },
  );
