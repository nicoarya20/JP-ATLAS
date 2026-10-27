/**
 * Access-mode settings. Maintenance stays super-admin — it is a technical switch (AD-03 boundary 3)
 * — but the sign-in policy (`/access-policy`) is one an Admin owns: who may register, whether a new
 * account waits for approval, and how long an invitation lives. Nested in settingsOpsApi, so every
 * route here inherits the `/settings` prefix.
 */
import { Elysia, t } from 'elysia';
import { AUDIT_ACTIONS, audit } from '../audit';
import { requireAnyRole, requireRole } from '../guard';
import { ROLES } from '../permissions';
import {
  type AccessPolicySettings,
  getAccessPolicySettings,
  INVITATION_TTL_DAYS_MAX,
  upsertAccessPolicy,
} from '../settings-access-policy';
import { upsertMaintenance } from '../settings-maintenance';
import { fail } from '../pm/respond';

const ROLE = t.Union([
  t.Literal(ROLES.MEMBER),
  t.Literal(ROLES.PROJECT_MANAGER),
  t.Literal(ROLES.ADMIN),
  t.Literal(ROLES.SUPER_ADMIN),
]);

/**
 * `defaultRole` is a free string here on purpose: the schema does not whitelist the two signup
 * roles, so a request naming `admin` reaches `normalizeAccessPolicy` and is refused there with the
 * message that explains why (AD-03 boundary 2) — a bare 422 would hide the escalation attempt.
 */
const AccessPolicyBody = t.Object({
  requiresApproval: t.Nullable(t.Boolean()),
  defaultRole: t.Nullable(t.String({ maxLength: 40 })),
  invitationTtlDays: t.Nullable(t.Integer({ minimum: 1, maximum: INVITATION_TTL_DAYS_MAX })),
});

export const settingsAccessApi = new Elysia()
  .put(
    '/maintenance',
    async ({ request, body }) => {
      const { user } = await requireRole(request, ROLES.SUPER_ADMIN);
      const saved = await upsertMaintenance({
        enabled: body.enabled,
        message: body.message ?? null,
        allowRoles: body.allowRoles ?? null,
      });
      void audit({
        actor: user,
        headers: request.headers,
        action: AUDIT_ACTIONS.SETTINGS_MAINTENANCE_UPDATE,
        targetType: 'settings',
        targetId: 'maintenance',
        summary: body.enabled ? 'Mode maintenance DIAKTIFKAN' : 'Mode maintenance dimatikan',
        meta: body,
      });
      return saved;
    },
    {
      body: t.Object({
        enabled: t.Boolean(),
        message: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
        allowRoles: t.Optional(t.Nullable(t.Array(ROLE, { maxItems: 3 }))),
      }),
    },
  )
  /** Admin + super-admin (AD-06): the sign-in policy, nulls kept so the panel can show "bawaan". */
  .get('/access-policy', async ({ request }) => {
    await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    return await getAccessPolicySettings();
  })
  .put(
    '/access-policy',
    async ({ request, body, status }) => {
      const actor = await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
      if (actor.impersonatedBy) return fail(status, 'IMPERSONATING');
      try {
        // `defaultRole` is a free string in the body on purpose (see AccessPolicyBody); the cast is
        // safe because normalizeAccessPolicy refuses any role outside SIGNUP_ROLES at runtime.
        const saved = await upsertAccessPolicy({
          requiresApproval: body.requiresApproval,
          defaultRole: body.defaultRole as AccessPolicySettings['defaultRole'],
          invitationTtlDays: body.invitationTtlDays,
        });
        void audit({
          actor: actor.user,
          headers: request.headers,
          action: AUDIT_ACTIONS.SETTINGS_ACCESS_POLICY_UPDATE,
          targetType: 'settings',
          targetId: 'access-policy',
          summary: `Kebijakan masuk diubah (persetujuan ${
            body.requiresApproval === null ? 'bawaan' : body.requiresApproval ? 'wajib' : 'tidak'
          }, peran ${body.defaultRole ?? 'bawaan'})`,
          meta: body,
        });
        return saved;
      } catch (err) {
        // normalizeAccessPolicy rejects a privileged default role or an out-of-range TTL.
        return fail(status, 'VALIDATION', { error: (err as Error).message });
      }
    },
    { body: AccessPolicyBody },
  );
