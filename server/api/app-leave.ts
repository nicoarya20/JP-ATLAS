/** Assembles the leave routes: the requester's own, the approver's, and the workspace switch; all keep the `/leave` prefix. */
import { Elysia } from 'elysia';
import { leaveDecideApi } from './app-leave.decide';
import { leaveMeApi } from './app-leave.me';
import { leaveSettingsApi } from './app-leave.settings';

// One mount in `app.ts` (capped at 62 lines), like the project schedule assembler.
export const leaveApi = new Elysia().use(leaveMeApi).use(leaveDecideApi).use(leaveSettingsApi);
