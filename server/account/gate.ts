/** API-facing translation of a held account into a 403 error body. */
import type { HeldKind } from './status';

export type AccountGateBody = { error: string; code: 'ACCOUNT_PENDING' | 'ACCOUNT_REJECTED' };

const GATE_BODIES: Partial<Record<HeldKind, AccountGateBody>> = {
  pending: {
    error: 'Akun kamu menunggu persetujuan Admin. Coba lagi setelah disetujui.',
    code: 'ACCOUNT_PENDING',
  },
  rejected: {
    error: 'Pendaftaran akun kamu ditolak. Hubungi Admin untuk informasi lebih lanjut.',
    code: 'ACCOUNT_REJECTED',
  },
};

/**
 * The 403 body for a pending or rejected account, or null otherwise. A banned
 * account deliberately gets no third code (X3 M18: suspension stays the `banned`
 * mechanism), so callers keep their existing unauthenticated answer for it.
 */
export function accountGateResponse(held: { kind: HeldKind }): AccountGateBody | null {
  return GATE_BODIES[held.kind] ?? null;
}
