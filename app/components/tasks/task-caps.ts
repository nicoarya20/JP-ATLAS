/** Reading a task's `can{}` on the client: shown, enabled, and the reason when greyed out. */
import type { CapValue } from '@server/access/capabilities';
import { DENY_UI } from '@server/access/decision';

/** A missing key hides the control; `true` enables it; a code shows it greyed out. */
export const isShown = (cap: CapValue | undefined): cap is CapValue => cap !== undefined;

/** The sentence explaining a greyed-out control, or null when it is enabled or hidden. */
export function capReason(cap: CapValue | undefined): string | null {
  if (cap === undefined || cap === true) return null;
  return cap in DENY_UI ? DENY_UI[cap as keyof typeof DENY_UI].message : null;
}
