/** Project routes (`/api/app/projects`): the list and one project's detail here, writes in `app-projects.write.ts`. */
import { Elysia, t } from 'elysia';
import { PROJECT_STATUSES } from '../pm/enums';
import { PAGE_LIMIT_DEFAULT } from '../pm/limits';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { getProjectDetail, listProjects, PROJECT_SORTS } from '../project/project.query';
import { IdParam, oneOf, PageQuery } from './app-common';
import { appContext } from './app-context';
import { projectDraftApi } from './app-projects.draft';
import { projectTemplatesApi } from './app-projects.templates';
import { projectWriteApi } from './app-projects.write';

const SEARCH_MAX_LENGTH = 100;

const ListQuery = t.Object({
  ...PageQuery.properties,
  scope: t.Optional(oneOf(['mine', 'all'])),
  status: t.Optional(oneOf(PROJECT_STATUSES)),
  q: t.Optional(t.String({ maxLength: SEARCH_MAX_LENGTH })),
  sort: t.Optional(oneOf(PROJECT_SORTS)),
  // Flags in the URL style the list filters use: present as `1`, absent otherwise (anything else is a 422).
  perhatian: t.Optional(t.Literal('1')),
  rencana: t.Optional(t.Literal('1')),
});

export const projectsApi = new Elysia({ prefix: '/projects' })
  .use(appContext)
  .use(projectDraftApi)
  .use(projectTemplatesApi)
  /**
   * Projects the caller may see: `{ items, total, page, limit }`; a Member asking for `all` gets `mine`.
   * `perhatian=1` keeps active projects that are at risk or late; `rencana=1` adds `plan` to each item.
   */
  .get(
    '/',
    async ({ actor, query }) => {
      const limit = query.limit ?? PAGE_LIMIT_DEFAULT;
      const page = Math.floor(query.page ?? 1);
      const { items, total } = await listProjects(toPrincipal(actor), {
        scope: query.scope ?? 'mine',
        status: query.status,
        q: query.q?.trim() || undefined,
        sort: query.sort,
        attention: query.perhatian === '1',
        withPlan: query.rencana === '1',
        limit,
        // Capped so an absurd `page` stays a valid, empty page instead of a database error.
        offset: Math.min((page - 1) * limit, Number.MAX_SAFE_INTEGER),
        now: new Date(),
      });
      return { items, total, page, limit };
    },
    { query: ListQuery },
  )
  /** One project with `can{}`; a missing, trashed or hidden id all answer the same 404. */
  .get(
    '/:id',
    async ({ actor, params, status }) => {
      const detail = await getProjectDetail(toPrincipal(actor), params.id, new Date());
      return detail ?? fail(status, 'NOT_FOUND');
    },
    { params: IdParam },
  )
  .use(projectWriteApi);
