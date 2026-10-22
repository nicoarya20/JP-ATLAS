/** Assembles the project schedule routes (S5a): phases and milestones, deadline extension, condition override, activity. */
import { Elysia } from 'elysia';
import { projectDeadlineApi } from './app-projects.deadline';
import { projectPlanApi } from './app-projects.plan';

// One mount in `app.ts` (which is capped at 60 lines); both routers keep their own `/projects` prefix.
export const projectScheduleApi = new Elysia().use(projectPlanApi).use(projectDeadlineApi);
