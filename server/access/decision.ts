/**
 * Policy decision primitives shared by the pure access modules. Keep this file
 * free of env/db/Bun imports: the browser bundle imports it for button state.
 * The code list lives in `pm/errors` (one source, X3 M8); extend it there, additively.
 */
import type { DenyCode } from '../pm/errors';

export { DENY_CODES, type DenyCode } from '../pm/errors';

export type Decision = { ok: true } | { ok: false; code: DenyCode };

export type DenyUi = {
  http: 403 | 404 | 409 | 410 | 422;
  /** `hide` = the control is irrelevant to this viewer; `disable` = show it greyed out with the reason. */
  ui: 'hide' | 'disable';
  message: string;
};

// `Record<DenyCode, …>` makes a code added to `pm/errors` without an entry here a compile error.
// `http` must equal the `PM_ERRORS` status for the same code (tests/access/level.test.ts) so the API and UI agree.
// Messages are user-facing Indonesian and say what to do next, never internal jargon.
export const DENY_UI: Record<DenyCode, DenyUi> = {
  NOT_MANAGER: {
    http: 403,
    ui: 'hide',
    message: 'Hanya pengelola proyek ini yang bisa melakukan ini. Minta pengelola untuk membantu.',
  },
  NOT_MEMBER: {
    http: 403,
    ui: 'hide',
    message: 'Kamu belum menjadi anggota proyek ini. Minta pengelola proyek untuk menambahkanmu.',
  },
  NOT_OWNER: {
    http: 403,
    ui: 'hide',
    message:
      'Hanya pembuat atau pengerja tugas ini yang bisa melakukannya. Minta mereka atau pengelola.',
  },
  NOT_ADMIN: {
    http: 403,
    ui: 'hide',
    message: 'Hanya Admin yang bisa mengelola akun pengguna. Hubungi Admin tim kamu.',
  },
  NOT_APP_ROLE: {
    http: 403,
    ui: 'hide',
    message: 'Peran akunmu belum cukup untuk ini. Hubungi Admin bila kamu perlu aksesnya.',
  },
  SELF_REVIEW: {
    http: 403,
    ui: 'disable',
    message: 'Kamu tidak bisa memeriksa pekerjaanmu sendiri. Minta pengelola lain memeriksanya.',
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
  IMPERSONATING: {
    http: 403,
    ui: 'disable',
    message:
      'Aksi ini dinonaktifkan selama kamu menyamar sebagai pengguna lain. Akhiri penyamaran dulu.',
  },
  WRONG_STATE: {
    http: 409,
    ui: 'hide',
    message: 'Status data ini sudah berubah. Muat ulang halaman lalu coba lagi.',
  },
  LOCKED_BY_STATUS: {
    http: 409,
    ui: 'disable',
    message: 'Pengaturan ini terkunci selama tugas sedang diperiksa, selesai, atau dibatalkan.',
  },
  REVIEW_REQUIRED: {
    http: 409,
    ui: 'disable',
    message: 'Tugas ini perlu diperiksa dulu. Ajukan pemeriksaan sebelum menyelesaikannya.',
  },
  LAST_MANAGER: {
    http: 409,
    ui: 'disable',
    message: 'Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu.',
  },
  IS_LEAD: {
    http: 409,
    ui: 'disable',
    message: 'Dia masih penanggung jawab utama. Tunjuk penanggung jawab lain dulu.',
  },
  PROJECT_IN_TRASH: {
    http: 409,
    ui: 'disable',
    message: 'Proyeknya ada di Sampah. Pulihkan proyeknya dulu.',
  },
  NO_PROJECT: {
    http: 409,
    ui: 'hide',
    message: 'Data ini belum terhubung ke proyek. Hubungkan ke proyek dulu.',
  },
  REASON_REQUIRED: {
    http: 422,
    ui: 'disable',
    // Shared by reopen and (S4) return, so the text names no single step (N10).
    message: 'Tuliskan alasannya agar tim paham.',
  },
  CANCEL_NOTE_REQUIRED: {
    http: 422,
    ui: 'disable',
    message: "Memilih 'Lainnya' perlu catatan singkat. Tulis alasannya dulu.",
  },
  ROLE_CANNOT_TRASH: {
    http: 403,
    ui: 'disable',
    message:
      'Hanya Admin atau Project Manager yang boleh menghapus proyek. Minta mereka melakukannya.',
  },
  EXPIRED: {
    http: 410,
    ui: 'disable',
    message: 'Masa pemulihannya sudah lewat, jadi data ini tidak bisa dipulihkan lagi.',
  },
  // Hidden, not greyed out: the permanent-delete control must not exist for non-Admin roles (P8 §4).
  ROLE_CANNOT_PURGE: {
    http: 403,
    ui: 'hide',
    message: 'Hanya Admin yang boleh menghapus selamanya. Minta Admin melakukannya.',
  },
  NOT_IN_TRASH: {
    http: 409,
    ui: 'hide',
    message: 'Data ini tidak ada di Sampah. Muat ulang halaman, lalu coba lagi.',
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
