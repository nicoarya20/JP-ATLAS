/**
 * Office announcement banner (AD-05). Admin may read and write it — the app's own message to
 * everyone is a setting an Admin owns, like branding (AD-03). Nested in settingsOpsApi, so these
 * inherit the `/settings` prefix: GET/PUT/DELETE `/api/settings/announcement`.
 *
 * Writing is refused while the caller is impersonating (AD-03 boundary 4): posting an office-wide
 * notice under someone else's session is exactly the kind of act impersonation must not be able to
 * perform. Reading is harmless, so the GET carries no such guard.
 */
import { Elysia, t } from 'elysia';
import { AUDIT_ACTIONS, audit } from '../audit';
import { requireAnyRole } from '../guard';
import { ROLES } from '../permissions';
import { fail } from '../pm/respond';
import {
  ANNOUNCEMENT_LEVELS,
  ANNOUNCEMENT_TEXT_MAX,
  getAnnouncement,
  upsertAnnouncement,
} from '../settings-announcement';

const Level = t.Union(ANNOUNCEMENT_LEVELS.map((l) => t.Literal(l)));

const AnnouncementBody = t.Object({
  text: t.String({ maxLength: ANNOUNCEMENT_TEXT_MAX }),
  level: Level,
  active: t.Boolean(),
  dismissibleUntil: t.Nullable(t.String()),
});

export const settingsAnnouncementApi = new Elysia()
  /** Admin: the full stored banner (inactive text included), so the editor can repopulate itself. */
  .get('/announcement', async ({ request }) => {
    await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    return await getAnnouncement();
  })
  .put(
    '/announcement',
    async ({ request, body, status }) => {
      const actor = await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
      if (actor.impersonatedBy) return fail(status, 'IMPERSONATING');
      try {
        const saved = await upsertAnnouncement(body);
        void audit({
          actor: actor.user,
          headers: request.headers,
          action: AUDIT_ACTIONS.SETTINGS_ANNOUNCEMENT_UPDATE,
          targetType: 'settings',
          targetId: 'announcement',
          summary: body.active
            ? `Pengumuman ditayangkan (nada ${body.level})`
            : 'Pengumuman disimpan tanpa ditayangkan',
          meta: body,
        });
        return saved;
      } catch (err) {
        // normalizeAnnouncement throws an Indonesian message for empty/overlong text or a bad date.
        return fail(status, 'VALIDATION', { error: (err as Error).message });
      }
    },
    { body: AnnouncementBody },
  )
  /** Admin: forget the banner entirely (distinct from active:false, which keeps the text). */
  .delete('/announcement', async ({ request, status }) => {
    const actor = await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (actor.impersonatedBy) return fail(status, 'IMPERSONATING');
    const saved = await upsertAnnouncement(null);
    void audit({
      actor: actor.user,
      headers: request.headers,
      action: AUDIT_ACTIONS.SETTINGS_ANNOUNCEMENT_UPDATE,
      targetType: 'settings',
      targetId: 'announcement',
      summary: 'Pengumuman dihapus',
    });
    return saved;
  });
