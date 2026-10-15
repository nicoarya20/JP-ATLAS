/**
 * Policy decision primitives shared by the pure access modules. Keep this file
 * free of env/db/Bun imports: the browser bundle imports it for button state.
 * Owned by the S0.b lane after S0A-03 merges; extend `DENY_CODES` additively only.
 */

export const DENY_CODES = [
  'NOT_ADMIN',
  'SELF_TARGET',
  'TARGET_PROTECTED',
  'WRONG_STATE',
  'IMPERSONATING',
  'REASON_REQUIRED',
] as const;
export type DenyCode = (typeof DENY_CODES)[number];

export type Decision = { ok: true } | { ok: false; code: DenyCode };

export type DenyUi = {
  http: 403 | 409 | 422;
  /** `hide` = the control is irrelevant to this viewer; `disable` = show it greyed out with the reason. */
  ui: 'hide' | 'disable';
  message: string;
};

// Messages are user-facing Indonesian and say what to do next, never internal jargon.
export const DENY_UI: Record<DenyCode, DenyUi> = {
  NOT_ADMIN: {
    http: 403,
    ui: 'hide',
    message: 'Hanya Admin yang bisa mengelola akun pengguna. Hubungi Admin tim kamu.',
  },
  SELF_TARGET: {
    http: 403,
    ui: 'disable',
    message: 'Kamu tidak bisa mengubah akunmu sendiri. Minta Admin lain untuk melakukannya.',
  },
  TARGET_PROTECTED: {
    http: 403,
    ui: 'disable',
    message: 'Akun atau peran ini dilindungi dan tidak bisa diubah dengan akses kamu saat ini.',
  },
  WRONG_STATE: {
    http: 409,
    ui: 'hide',
    message: 'Status akun ini sudah berubah. Muat ulang halaman lalu coba lagi.',
  },
  IMPERSONATING: {
    http: 403,
    ui: 'disable',
    message:
      'Aksi ini dinonaktifkan selama kamu menyamar sebagai pengguna lain. Akhiri penyamaran dulu.',
  },
  REASON_REQUIRED: {
    http: 422,
    ui: 'disable',
    message: 'Tuliskan alasan penolakan 3–200 karakter agar pengguna paham.',
  },
};

/** Build the allow decision. */
export function allow(): Decision {
  return { ok: true };
}

/** Build a deny decision carrying the machine-readable reason. */
export function deny(code: DenyCode): Decision {
  return { ok: false, code };
}
