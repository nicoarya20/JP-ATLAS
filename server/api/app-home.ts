/**
 * Beranda route (`GET /api/app/home`, P4): the whole screen in one read-only call, scoped to the
 * caller. Every role gets the same shape; what differs is only what the caller may see and manage.
 */
import { Elysia } from 'elysia';
import { getHome } from '../home/home.service';
import { toPrincipal } from '../project/membership.query';
import { appContext } from './app-context';

export const homeApi = new Elysia({ prefix: '/home' })
  .use(appContext)
  /** Greeting, briefing, counters, focus, done this week, projects, agenda, activity and Ask Data answers. */
  .get('/', ({ actor }) => getHome(toPrincipal(actor)));
