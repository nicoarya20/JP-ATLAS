/** People picker route (`GET /api/app/team/picker?q&projectId&limit`): names and job titles only (Q8). */
import { Elysia, t } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { PICKER_LIMIT_DEFAULT, pickPeople } from '../team/picker.query';
import { appContext } from './app-context';

const SEARCH_MAX_LENGTH = 100;

const PickerQuery = t.Object({
  q: t.Optional(t.String({ maxLength: SEARCH_MAX_LENGTH })),
  projectId: t.Optional(t.String({ minLength: 1 })),
  // Any positive number is accepted and clamped by the query, so a too-big limit is not an error.
  limit: t.Optional(t.Numeric({ minimum: 1, default: PICKER_LIMIT_DEFAULT })),
});

export const teamPickerApi = new Elysia({ prefix: '/team' })
  .use(appContext)
  /** `{ items: [{ id, name, jobTitle, image }] }`; without `projectId` only for those who may create projects. */
  .get(
    '/picker',
    async ({ actor, query, status }) => {
      const r = await pickPeople(toPrincipal(actor), query);
      return r.ok ? { items: r.items } : fail(status, r.code);
    },
    { query: PickerQuery },
  );
