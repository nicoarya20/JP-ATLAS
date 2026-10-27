/**
 * The Admin reading of the audit trail (P11 AD-18).
 *
 * `/dev/audit` shows super-admins every row as it was written. The Admin area answers a narrower
 * question — "who approved this account, who changed this role, who deleted this project?" — so
 * this module holds the two rules that make the same table readable by a non-technical admin:
 *
 * 1. ONE explicit whitelist (`ADMIN_ACTIVITY_CATEGORIES`). Actions are opted in by name, never
 *    opted out: a new technical action added to `AUDIT_ACTIONS` tomorrow stays invisible here
 *    until somebody files it under a category on purpose.
 * 2. Email masking (`maskEmail`). The Admin screen never needs a whole address to answer its
 *    question, and CLAUDE.md §12 forbids carrying PII further than it is needed. The masking runs
 *    here, on the server, so a full address never leaves the process in an Admin response.
 *
 * Nothing in here changes how a row is written — `audit()` and the `audit_log` shape are untouched.
 */
import { AUDIT_ACTIONS, type AuditAction } from './audit';

/**
 * Admin-facing grouping of the whitelisted actions. The ids are the filter values in the UI;
 * the labels are the only words an admin sees.
 *
 * Deliberately NOT here (the "urusan teknis server" the brief excludes): `logs.*`,
 * `settings.rate_limit.*`, `settings.retention.update`, `settings.maintenance.update`,
 * `settings.demo.update`, `ops.reset`, `apikey.*`, `session.revoke`, `post.*`,
 * `user.impersonate`, `task.*`, `event.*`, `trash.retention`, `project.condition.*` and
 * `leave.*`. Those are either super-admin infrastructure work or per-item product edits; both
 * would bury the five questions this page exists to answer.
 */
export const ADMIN_ACTIVITY_CATEGORIES = [
  {
    id: 'akun',
    label: 'Akun & persetujuan',
    actions: [
      AUDIT_ACTIONS.USER_APPROVE,
      AUDIT_ACTIONS.USER_REJECT,
      AUDIT_ACTIONS.USER_BAN,
      AUDIT_ACTIONS.USER_UNBAN,
      AUDIT_ACTIONS.USER_DELETE,
      AUDIT_ACTIONS.INVITATION_CREATE,
      AUDIT_ACTIONS.INVITATION_REVOKE,
      AUDIT_ACTIONS.INVITATION_USE,
    ],
  },
  {
    id: 'peran',
    label: 'Perubahan peran',
    actions: [AUDIT_ACTIONS.USER_ROLE_SET],
  },
  {
    id: 'setelan',
    label: 'Setelan aplikasi',
    // Only the three settings an Admin may actually change (P11 AD-03). Rate limit, retensi,
    // maintenance and demo stay super-admin, so they stay out of the Admin reading too.
    actions: [
      AUDIT_ACTIONS.SETTINGS_BRANDING_UPDATE,
      AUDIT_ACTIONS.SETTINGS_AUTH_UPDATE,
      AUDIT_ACTIONS.SETTINGS_FEATURES_UPDATE,
    ],
  },
  {
    id: 'proyek',
    label: 'Proyek dihapus & dipulihkan',
    actions: [
      AUDIT_ACTIONS.PROJECT_TRASH,
      AUDIT_ACTIONS.PROJECT_RESTORE,
      AUDIT_ACTIONS.TRASH_PURGE,
    ],
  },
  {
    id: 'data',
    label: 'Ekspor data',
    actions: [AUDIT_ACTIONS.DATA_EXPORT],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  actions: readonly AuditAction[];
}>;

export type AdminActivityCategoryId = (typeof ADMIN_ACTIVITY_CATEGORIES)[number]['id'];

/** Flat whitelist, in category order; the SQL filter and the UI dropdown both read this. */
export const ADMIN_ACTIVITY_ACTIONS: readonly AuditAction[] = ADMIN_ACTIVITY_CATEGORIES.flatMap(
  (c) => [...c.actions],
);

const ACTION_SET: ReadonlySet<string> = new Set<string>(ADMIN_ACTIVITY_ACTIONS);

/** Guards the `action` query parameter: an action outside the whitelist is not a filter, it is a bypass. */
export function isAdminActivityAction(action: string): action is AuditAction {
  return ACTION_SET.has(action);
}

const CATEGORY_BY_ID = new Map<string, (typeof ADMIN_ACTIVITY_CATEGORIES)[number]>(
  ADMIN_ACTIVITY_CATEGORIES.map((c) => [c.id, c]),
);

/** The whitelisted actions of one category, or `null` when the id is unknown. */
export function actionsOfCategory(id: string): readonly AuditAction[] | null {
  return CATEGORY_BY_ID.get(id)?.actions ?? null;
}

/** Fixed number of dots, so a masked address never leaks how long the real one is. */
const MASK = '••••';
/** Below this, the local part has nothing left to recognise it by, so all of it is masked. */
const MIN_VISIBLE_LOCAL = 3;
const KEEP_CHARS = 2;

/**
 * `budi@contoh.com` → `bu••••@contoh.com`. Enough for an admin to recognise a colleague they
 * already know, not enough to harvest an address list. The domain stays readable because it tells
 * an internal account from an outside one, which is the thing admins actually check.
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  // No domain to keep (malformed snapshot): mask the whole thing rather than pass it through.
  if (at <= 0) return MASK;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length < MIN_VISIBLE_LOCAL) return `${MASK}${domain}`;
  return `${local.slice(0, KEEP_CHARS)}${MASK}${domain}`;
}
