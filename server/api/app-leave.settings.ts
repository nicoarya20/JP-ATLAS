/**
 * The workspace switch "Cuti perlu persetujuan" (`/api/app/leave/settings`). Everyone signed in may
 * read it (the request form's button says "Kirim pengajuan" or "Simpan cuti" by it); only Admin and
 * Super-admin change it, which is audited and session only (`PM_KEY_DENY`).
 */
import { Elysia, t } from 'elysia';
import { maskEmail } from '../account/mask-email';
import { AUDIT_ACTIONS, audit } from '../audit';
import { canManageLeaveSettings } from '../leave/leave.policy';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { getLeaveSettings, upsertLeaveSettings } from '../settings-leave';
import { appContext } from './app-context';

const SettingsBody = t.Object({ requiresApproval: t.Boolean() }, { additionalProperties: false });

export const leaveSettingsApi = new Elysia({ prefix: '/leave/settings' })
  .use(appContext)
  .get('/', () => getLeaveSettings())
  .put(
    '/',
    async ({ actor, body, request, status }) => {
      const can = canManageLeaveSettings(toPrincipal(actor));
      if (!can.ok) return fail(status, can.code);
      const saved = await upsertLeaveSettings({ requiresApproval: body.requiresApproval });
      void audit({
        actor: { id: actor.user.id, email: maskEmail(actor.user.email) },
        headers: request.headers,
        action: AUDIT_ACTIONS.SETTINGS_LEAVE_UPDATE,
        targetType: 'settings',
        summary: `Cuti perlu persetujuan ${saved.requiresApproval ? 'dihidupkan' : 'dimatikan'}`,
        meta: { requiresApproval: saved.requiresApproval },
      });
      return saved;
    },
    { body: SettingsBody },
  );
