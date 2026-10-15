/** Access-mode settings: maintenance (super-admin). Nested in settingsOpsApi, inherits `/settings`. */
import { Elysia, t } from 'elysia';
import { AUDIT_ACTIONS, audit } from '../audit';
import { requireRole } from '../guard';
import { ROLES } from '../permissions';
import { upsertMaintenance } from '../settings-maintenance';

const ROLE = t.Union([
  t.Literal(ROLES.MEMBER),
  t.Literal(ROLES.PROJECT_MANAGER),
  t.Literal(ROLES.ADMIN),
  t.Literal(ROLES.SUPER_ADMIN),
]);

export const settingsAccessApi = new Elysia().put(
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
);
