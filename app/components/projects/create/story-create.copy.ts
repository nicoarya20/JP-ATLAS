/** Copy of "Ceritakan proyeknya" (story-mode): the story form and the draft review screen. */
import { PROJECT_DRAFT_TEXT_MAX } from '@server/ai/project-draft.limits';

export const STORY_COPY = {
  textLabel: 'Ceritakan proyeknya',
  textPlaceholder:
    'Contoh: Mau renovasi dapur. Minggu pertama beli material, minggu kedua bongkar dan pasang, deadline sebulan dari sekarang, prioritas tinggi.',
  textHint: (len: number) => `${len}/${PROJECT_DRAFT_TEXT_MAX} karakter`,
  submit: 'Susun draf',
  composing: 'Menyusun draf…',
  back: 'Kembali ke pilihan cara',
  fallbackNotice:
    'Ceritakan proyeknya belum bisa dipakai sekarang. Ceritamu sudah dipindahkan ke kolom deskripsi — lanjutkan di form.',
  rateLimited: (seconds: number) => `Terlalu sering memakai ini. Coba lagi dalam ${seconds} detik.`,
  genericError: 'Gagal menyusun draf. Coba lagi.',
  reviewTitle: 'Periksa draf proyek',
  reviewDescription: 'AI mengusulkan ini dari ceritamu. Ubah atau hapus sebelum disimpan.',
  questionTitle: 'Ceritanya belum jelas',
  questionFallback: 'Isi form saja',
  phasesTitle: 'Tahapan',
  looseTasksTitle: 'Tugas tanpa tahapan',
  noPhases: 'Tidak ada tahapan yang diusulkan.',
  noLooseTasks: 'Tidak ada tugas lepas yang diusulkan.',
  removePhase: 'Hapus fase ini',
  removeTask: 'Hapus tugas ini',
  saveAsTemplate: 'Simpan juga sebagai template',
  submitCreate: 'Buat proyek',
  submitFailed: 'Gagal membuat proyek',
  templateSaved: (name: string) => `Template "${name}" disimpan.`,
  templateSaveFailed: 'Gagal menyimpan template',
} as const;
