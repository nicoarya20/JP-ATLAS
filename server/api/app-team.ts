/**
 * Team routes (`/api/app/team`, S6 M03/M04): the people the caller shares projects with, and one
 * person's detail. Reads only, open to every signed-in role; what a caller may not see is left out
 * of the body instead of being zeroed, so `load`, `alsoElsewhere`, `tasks` and `summary.active`
 * are simply absent (D10, `rencana/P7-s6-tim.md` §5).
 *
 * Mounted after `teamPickerApi` in `app.ts` so `/team/picker` keeps answering the picker and is
 * never read as a `:userId`.
 */
import { Elysia, t } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { isRefused, type TeamSort } from '../team/team.dto';
import { getPerson, listTeam, TEAM_LIMIT_DEFAULT, TEAM_SEARCH_MAX } from '../team/team.query';
import { oneOf } from './app-common';
import { appContext } from './app-context';

/** The sorts the list accepts; `active` and `overdue` need the right to see other people's numbers. */
const TEAM_SORTS = ['name', 'active', 'overdue'] as const satisfies readonly TeamSort[];

const ListQuery = t.Object({
  projectId: t.Optional(t.String({ minLength: 1 })),
  q: t.Optional(t.String({ maxLength: TEAM_SEARCH_MAX })),
  sort: t.Optional(oneOf(TEAM_SORTS)),
  // Any positive number is accepted and clamped by the query, so a too-big limit is not an error.
  limit: t.Optional(t.Numeric({ minimum: 1, default: TEAM_LIMIT_DEFAULT })),
  offset: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
});

const UserParam = t.Object({ userId: t.String({ minLength: 1 }) });

export const teamApi = new Elysia({ prefix: '/team' })
  .use(appContext)
  /**
   * `{ summary: { people, projects, active?, overdue? }, people: [...], total }`. A `projectId` the
   * caller does not follow answers the same `404 NOT_FOUND` as one that does not exist (D8).
   *
   * Known limit: `sort=overdue` orders **the page on screen**, not the whole team. The counts are
   * only known once the page of people has been chosen — that is what keeps the list at four
   * queries whatever its size — so paging through a team sorted by overdue re-sorts each page on
   * its own. `sort=name` has no such limit. A caller with no right to anyone else's numbers gets
   * `422 SORT_NOT_ALLOWED` rather than a silent fall back to the name order.
   */
  .get(
    '/',
    async ({ actor, query, status }) => {
      const r = await listTeam(
        toPrincipal(actor),
        {
          projectId: query.projectId,
          q: query.q?.trim() || undefined,
          sort: query.sort,
          limit: query.limit,
          offset: query.offset,
        },
        new Date(),
      );
      return isRefused(r) ? fail(status, r.code) : r;
    },
    { query: ListQuery },
  )
  /**
   * `{ person, projects, tasks?, tasksVisible, load?, alsoElsewhere? }`. Someone the caller shares
   * no project with answers `404 NOT_FOUND`, never 403: the caller may not learn that the account
   * exists. An Admin may open a held or banned account; to everyone else it does not exist either.
   */
  .get(
    '/:userId',
    async ({ actor, params, status }) => {
      const r = await getPerson(toPrincipal(actor), params.userId, new Date());
      return isRefused(r) ? fail(status, r.code) : r;
    },
    { params: UserParam },
  );
