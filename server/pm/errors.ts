/**
 * Single error-code catalog for the PM API (S0-S2). Pure: the browser bundle
 * imports it, so no env/db/runtime globals here. Spelling follows R04 §3.5 (M8).
 */

/** HTTP statuses a PM error may use. */
export type PmHttp = 403 | 404 | 409 | 422 | 429 | 503;

export type PmErrorEntry = { http: PmHttp; message: string };

/** Codes that are not permission decisions (validation, conflicts, limits, account gate). */
export const PM_API_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'STATE_CONFLICT',
  'STALE_VERSION',
  'LEAD_MUST_BE_MANAGER',
  'KIND_LIMIT',
  'KIND_IN_USE',
  'NO_ELIGIBLE_REVIEWER',
  'RATE_LIMITED',
  'STORAGE_DISABLED',
  'ACCOUNT_PENDING',
  'ACCOUNT_REJECTED',
] as const;

/**
 * Policy denial codes (`DenyCode`). `server/access/decision.ts` re-exports this
 * union and may only add to it. `NOT_VISIBLE` is intentionally absent: it maps to
 * `NOT_FOUND`/404 so a hidden record is indistinguishable from a missing one.
 */
export const DENY_CODES = [
  'NOT_MANAGER',
  'NOT_MEMBER',
  'NOT_OWNER',
  'NOT_ADMIN',
  'NOT_APP_ROLE',
  'SELF_REVIEW',
  'SELF_TARGET',
  'TARGET_PROTECTED',
  'IMPERSONATING',
  'WRONG_STATE',
  'LOCKED_BY_STATUS',
  'REVIEW_REQUIRED',
  'LAST_MANAGER',
  'IS_LEAD',
  'PROJECT_IN_TRASH',
  'NO_PROJECT',
  'REASON_REQUIRED', // reason/note inputs are checked by policy functions (X3 M8)
  'CANCEL_NOTE_REQUIRED',
  'ROLE_CANNOT_TRASH', // member-managers cannot trash a project (15 Oct 2026 decision)
] as const;

export type PmApiCode = (typeof PM_API_CODES)[number];
export type DenyCode = (typeof DENY_CODES)[number];
export type PmCode = PmApiCode | DenyCode;

/** Type guard: is `code` one of the policy denial codes? */
export function isDenyCode(code: string): code is DenyCode {
  return (DENY_CODES as readonly string[]).includes(code);
}

// `Record<PmCode, …>` makes a missing or misspelled code a compile error.
export const PM_ERRORS: Record<PmCode, PmErrorEntry> = {
  VALIDATION: {
    http: 422,
    message: 'Isian belum sesuai. Periksa kolom yang ditandai, lalu coba lagi.',
  },
  NOT_FOUND: { http: 404, message: 'Data tidak ditemukan atau kamu tidak punya akses.' },
  STATE_CONFLICT: {
    http: 409,
    message: 'Tugas ini sudah diubah orang lain. Muat ulang halaman, lalu coba lagi.',
  },
  STALE_VERSION: {
    http: 409,
    message: 'Catatan ini diubah orang lain. Salin tulisanmu, muat ulang, lalu gabungkan.',
  },
  LEAD_MUST_BE_MANAGER: {
    http: 422,
    message: 'Penanggung jawab utama harus berperan Pengelola di proyek ini.',
  },
  KIND_LIMIT: {
    http: 409,
    message:
      'Jumlah jenis tugas aktif di proyek ini sudah mencapai batas. Arsipkan salah satu dulu.',
  },
  KIND_IN_USE: {
    http: 409,
    message: 'Jenis ini sudah dipakai tugas. Arsipkan saja, jangan dihapus.',
  },
  NO_ELIGIBLE_REVIEWER: {
    http: 409,
    message: 'Belum ada pemeriksa yang bisa dipilih. Hubungi pengelola proyek.',
  },
  RATE_LIMITED: {
    http: 429,
    message: 'Terlalu banyak perubahan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.',
  },
  STORAGE_DISABLED: { http: 503, message: 'Penyimpanan file belum aktif. Hubungi admin.' },
  ACCOUNT_PENDING: {
    http: 403,
    message: 'Akunmu belum disetujui admin. Kami akan memberi kabar lewat email.',
  },
  ACCOUNT_REJECTED: {
    http: 403,
    message: 'Pendaftaran akunmu tidak disetujui. Hubungi admin bila ini keliru.',
  },
  NOT_MANAGER: { http: 403, message: 'Hanya pengelola proyek ini yang boleh melakukan ini.' },
  NOT_MEMBER: { http: 403, message: 'Kamu belum menjadi anggota proyek ini.' },
  NOT_OWNER: {
    http: 403,
    message: 'Hanya pembuat atau penanggung jawabnya yang boleh melakukan ini.',
  },
  NOT_ADMIN: { http: 403, message: 'Hanya admin yang boleh melakukan ini.' },
  NOT_APP_ROLE: { http: 403, message: 'Peran akunmu belum cukup untuk melakukan ini.' },
  SELF_REVIEW: { http: 403, message: 'Kamu tidak bisa memeriksa pekerjaanmu sendiri.' },
  SELF_TARGET: { http: 403, message: 'Aksi ini tidak bisa dilakukan pada akunmu sendiri.' },
  TARGET_PROTECTED: { http: 403, message: 'Akun ini dilindungi dan tidak bisa diubah olehmu.' },
  IMPERSONATING: {
    http: 403,
    message: 'Saat menyamar sebagai pengguna lain, aksi ini dinonaktifkan. Akhiri penyamaran dulu.',
  },
  WRONG_STATE: { http: 409, message: 'Aksi ini tidak bisa dilakukan pada status sekarang.' },
  LOCKED_BY_STATUS: {
    http: 409,
    message: 'Pengaturan ini terkunci selama tugas sedang diperiksa, selesai, atau dibatalkan.',
  },
  REVIEW_REQUIRED: {
    http: 409,
    message: 'Tugas ini perlu diperiksa dulu. Ajukan pemeriksaan sebelum menyelesaikannya.',
  },
  LAST_MANAGER: {
    http: 409,
    message: 'Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu.',
  },
  IS_LEAD: {
    http: 409,
    message: 'Dia masih penanggung jawab utama. Tunjuk penanggung jawab lain dulu.',
  },
  PROJECT_IN_TRASH: { http: 409, message: 'Proyeknya ada di Sampah. Pulihkan proyeknya dulu.' },
  NO_PROJECT: { http: 409, message: 'Data ini belum terhubung ke proyek.' },
  REASON_REQUIRED: { http: 422, message: 'Tuliskan alasannya agar tim paham.' },
  CANCEL_NOTE_REQUIRED: { http: 422, message: "Memilih 'Lainnya' perlu catatan singkat." },
  ROLE_CANNOT_TRASH: {
    http: 403,
    message:
      'Hanya admin atau Project Manager yang boleh menghapus proyek. Minta mereka melakukannya.',
  },
};
