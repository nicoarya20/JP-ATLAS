/**
 * Workspace switch "Cuti perlu persetujuan" (Pengaturan tim, Admin only). On by default: a leave
 * request waits for an approver. Off: every request is approved the moment it is sent.
 */
import { readSettingsRow, type SettingsRow, upsertSettingsRow } from './settings.core';

export type LeaveSettings = { requiresApproval: boolean };

/** Applies while the singleton row does not exist yet (a fresh install): approval is required. */
export const LEAVE_SETTINGS_DEFAULTS: LeaveSettings = { requiresApproval: true };

export function parseLeaveSettings(row: SettingsRow | null): LeaveSettings {
  return {
    requiresApproval: row?.leaveRequiresApproval ?? LEAVE_SETTINGS_DEFAULTS.requiresApproval,
  };
}

export async function getLeaveSettings(): Promise<LeaveSettings> {
  return parseLeaveSettings(await readSettingsRow());
}

/** Persists the switch and returns the stored value (the read cache is dropped by the write). */
export async function upsertLeaveSettings(s: LeaveSettings): Promise<LeaveSettings> {
  await upsertSettingsRow({ leaveRequiresApproval: s.requiresApproval });
  return getLeaveSettings();
}
