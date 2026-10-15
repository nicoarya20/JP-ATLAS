/** Masks an email for audit entries and logs (`budi@kantor.id` → `b***@kantor.id`); pure, no env/db imports. */

const MASK = '***';

/**
 * Keeps the first character of the local part and the whole domain, so an admin can still
 * recognise the account in the audit trail while the address is not stored in the clear.
 * A value without a usable `@` is fully hidden rather than echoed back.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return MASK;
  const at = email.lastIndexOf('@');
  if (at < 1) return MASK;
  return `${Array.from(email)[0]}${MASK}${email.slice(at)}`;
}
