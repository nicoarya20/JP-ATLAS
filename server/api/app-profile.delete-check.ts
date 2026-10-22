/** `GET /api/app/profile/delete-check`: the projects that stop the caller from deleting their account. */
import { Elysia } from 'elysia';
import { getDeleteBlockers } from '../account/delete-precheck';
import { fail } from '../pm/respond';
import { appContext } from './app-context';

export const deleteCheckApi = new Elysia({ prefix: '/delete-check' })
  .use(appContext)
  .get('/', async ({ actor, status }) => {
    if (actor.impersonatedBy) return fail(status, 'IMPERSONATING');
    const { projects, total } = await getDeleteBlockers(actor.user.id);
    return { canDelete: total === 0, projects, total };
  });
