/**
 * Product API at /api/app/* — default home for app feature endpoints. Every route
 * here requires a signed-in user of any role (session or API key with `app:*` scope);
 * `appContext` answers 401/403 first and types `actor` as non-null.
 * Per-feature role limits: check `actor.role` in the handler and return 403.
 * This file only mounts modules (L-C shared file): feature routes live in `app-<module>.ts`.
 */
import { Elysia, t } from 'elysia';
import { removeAvatar, uploadAvatar } from './app-avatar';
import { appContext } from './app-context';
import { eventsApi } from './app-events';
import { profileApi } from './app-profile';
import { projectsApi } from './app-projects';
import { projectMembersApi } from './app-projects.members';
import { projectTrashApi } from './app-projects.trash';
import { tasksApi } from './app-tasks';
import { taskDetailApi } from './app-tasks.detail';
import { taskWorkflowApi } from './app-tasks.workflow';
import { teamPickerApi } from './app-team.picker';
import { trashApi } from './app-trash';

export const appApi = new Elysia({ prefix: '/app' })
  // First on purpose: a parent's hooks only reach routes registered after them.
  .use(appContext)
  .use(profileApi)
  .use(projectsApi)
  .use(projectMembersApi)
  .use(projectTrashApi)
  .use(teamPickerApi)
  .use(trashApi)
  .use(eventsApi)
  .use(tasksApi)
  .use(taskWorkflowApi)
  .use(taskDetailApi)
  /** Example endpoint: who is calling. Replace or extend with real features. */
  .get('/whoami', ({ actor }) => ({
    userId: actor.user.id,
    name: actor.user.name,
    role: actor.role,
  }))
  /** Upload/replace the caller's profile photo (multipart field `file`, PNG/JPEG/WEBP/GIF ≤ 2 MB). */
  .post(
    '/avatar',
    async ({ actor, body, status }) => {
      const r = await uploadAvatar(actor.user.id, actor.user.image, body.file);
      return r.ok ? { image: r.image } : status(r.status, { error: r.error, code: r.code });
    },
    { body: t.Object({ file: t.Optional(t.File()) }) },
  )
  /** Remove the caller's profile photo. */
  .delete('/avatar', async ({ actor, status }) => {
    const r = await removeAvatar(actor.user.id, actor.user.image);
    return r.ok ? { image: r.image } : status(r.status, { error: r.error, code: r.code });
  });
