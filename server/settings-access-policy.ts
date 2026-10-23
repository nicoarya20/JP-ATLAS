/**
 * Sign-in policy Admin owns (P13 RD-01): whether a new account waits for approval, which role a
 * self-registered account gets and how long an invitation stays usable. Each column is NULL until
 * Admin sets it, and NULL means exactly the behaviour that is hard-coded today — so the migration
 * on its own changes no sign-up, and the console can tell "bawaan" from "ditimpa Admin".
 *
 * The allowed email domains are deliberately NOT here: they stay env-only (P13 §3 D6).
 */
import { INVITATION_TTL_DAYS } from './account/limits';
import { ROLES, type Role } from './permissions';
import { readSettingsRow, type SettingsRow, upsertSettingsRow } from './settings.core';

/**
 * Roles a self-registered account may be given. `admin` and `super-admin` are excluded on purpose:
 * this value is applied without review, so allowing either would turn the sign-up form into a
 * privilege-escalation path. `super-admin` is env-only anyway (`server/permissions.ts`).
 */
export const SIGNUP_ROLES: readonly Role[] = [ROLES.MEMBER, ROLES.PROJECT_MANAGER];

/** A year is already generous for an invitation; beyond that it is a permanent open door. */
export const INVITATION_TTL_DAYS_MAX = 365;

/** What Admin stored; `null` per field = still on the built-in default. */
export type AccessPolicySettings = {
  requiresApproval: boolean | null;
  defaultRole: Role | null;
  invitationTtlDays: number | null;
};

/** The policy the sign-up gate and the invitation query actually apply. */
export type AccessPolicy = {
  requiresApproval: boolean;
  defaultRole: Role;
  invitationTtlDays: number;
};

export const ACCESS_POLICY_DEFAULTS: AccessPolicy = {
  requiresApproval: true,
  defaultRole: ROLES.MEMBER,
  invitationTtlDays: INVITATION_TTL_DAYS,
};

export function isSignupRole(value: unknown): value is Role {
  return SIGNUP_ROLES.includes(value as Role);
}

/**
 * Read the stored policy. A stored role outside `SIGNUP_ROLES` is read as `null` (defence in
 * depth: a row written by an older build or by hand must not escalate anyone), and a TTL that is
 * out of range is read as `null` too, so the default applies instead of an absurd value.
 */
export function parseAccessPolicy(row: SettingsRow | null): AccessPolicySettings {
  const ttl = row?.invitationTtlDays ?? null;
  return {
    requiresApproval: row?.signupRequiresApproval ?? null,
    defaultRole: isSignupRole(row?.defaultSignupRole) ? row.defaultSignupRole : null,
    invitationTtlDays: ttl !== null && isValidTtl(ttl) ? ttl : null,
  };
}

export function effectiveAccessPolicy(s: AccessPolicySettings): AccessPolicy {
  return {
    requiresApproval: s.requiresApproval ?? ACCESS_POLICY_DEFAULTS.requiresApproval,
    defaultRole: s.defaultRole ?? ACCESS_POLICY_DEFAULTS.defaultRole,
    invitationTtlDays: s.invitationTtlDays ?? ACCESS_POLICY_DEFAULTS.invitationTtlDays,
  };
}

function isValidTtl(days: number): boolean {
  return Number.isInteger(days) && days >= 1 && days <= INVITATION_TTL_DAYS_MAX;
}

/** Validate what Admin submitted; throws with an Indonesian message so the API can answer 400. */
export function normalizeAccessPolicy(s: AccessPolicySettings): AccessPolicySettings {
  if (s.defaultRole !== null && s.defaultRole !== undefined && !isSignupRole(s.defaultRole))
    throw new Error(
      `Peran bawaan "${String(s.defaultRole)}" tidak boleh dipakai untuk pendaftar; pilih ${SIGNUP_ROLES.join(' atau ')}.`,
    );
  if (s.invitationTtlDays !== null && s.invitationTtlDays !== undefined) {
    if (!isValidTtl(s.invitationTtlDays))
      throw new Error(
        `Masa undangan harus bilangan bulat 1–${INVITATION_TTL_DAYS_MAX} hari (diterima: ${String(s.invitationTtlDays)}).`,
      );
  }
  return {
    requiresApproval: s.requiresApproval ?? null,
    defaultRole: s.defaultRole ?? null,
    invitationTtlDays: s.invitationTtlDays ?? null,
  };
}

/** What Admin stored, nulls intact — for the console, which shows "bawaan" per field. */
export async function getAccessPolicySettings(): Promise<AccessPolicySettings> {
  return parseAccessPolicy(await readSettingsRow());
}

/** The policy to apply on the sign-up path, defaults already resolved. */
export async function getAccessPolicy(): Promise<AccessPolicy> {
  return effectiveAccessPolicy(await getAccessPolicySettings());
}

export async function upsertAccessPolicy(s: AccessPolicySettings): Promise<AccessPolicySettings> {
  const next = normalizeAccessPolicy(s);
  await upsertSettingsRow({
    signupRequiresApproval: next.requiresApproval,
    defaultSignupRole: next.defaultRole,
    invitationTtlDays: next.invitationTtlDays,
  });
  return parseAccessPolicy(await readSettingsRow());
}
