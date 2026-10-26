/**
 * `GET /api/app/whoami`: who is calling, and what the app as a whole lets them do.
 *
 * It lived in `app.ts` as an example endpoint while the answer was three identity fields. It has a
 * module of its own now that it carries `caps`, because `app.ts` is mount-only and every feature
 * route belongs in an `app-<module>.ts`.
 *
 * `caps` is the full `AppCaps` from `appCaps()` — the very function the `/app` layout loader reads
 * to draw the sidebar, so there is one rule and no way for the web and a non-web client to drift.
 * It is sent from here rather than from a list route (GAP A-17) because these capabilities are
 * app-wide: whether somebody may start a project does not change from one page of `/projects` to
 * the next, so repeating it per page would be noise, and a client asks "what may I do" about
 * itself exactly once, when it signs in. The per-list `caps.createEvent` on the event and task
 * lists stays as it is and comes from this same function; nothing is computed twice.
 */
import { Elysia } from 'elysia';
import { appCaps } from '../access/capabilities';
import { toPrincipal } from '../project/membership.query';
import { appContext } from './app-context';

export const whoamiApi = new Elysia().use(appContext).get('/whoami', ({ actor }) => ({
  userId: actor.user.id,
  name: actor.user.name,
  role: actor.role,
  caps: appCaps(toPrincipal(actor)),
}));
