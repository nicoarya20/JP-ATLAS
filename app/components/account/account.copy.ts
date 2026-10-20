/** Indonesian copy for the account settings page (/app/settings), kept out of the components. */
import type { TextSize } from '@server/pm/enums';

export const SETTINGS_TITLE = 'Pengaturan';
export const SETTINGS_INTRO = 'Atur profil, ukuran tulisan, dan akun Anda.';

export const ACCOUNT_COPY = {
  title: 'Profil',
  description: 'Nama dan keterangan ini tampil untuk rekan satu proyek.',
  name: 'Nama',
  nameHint: 'Kosongkan untuk memakai nama dari akun Google Anda.',
  jobTitle: 'Jabatan',
  department: 'Divisi',
  phone: 'Nomor HP (tidak wajib)',
  phoneHint: 'Hanya Anda dan Admin yang bisa melihat nomor ini.',
  email: 'Email',
  emailHint: 'Email mengikuti akun Google Anda dan tidak bisa diubah di sini.',
  save: 'Simpan profil',
  reset: 'Batalkan perubahan',
  saved: 'Profil disimpan.',
  saveFailed: 'Gagal menyimpan profil',
} as const;

export const APPEARANCE_COPY = {
  title: 'Tampilan',
  description: 'Pilih ukuran tulisan yang paling nyaman dibaca. Berlaku di seluruh aplikasi.',
  sample: 'Contoh tulisan: Rapat persiapan pameran, Kamis pukul 09.00.',
  active: 'Dipakai sekarang',
  choose: 'Pilih ukuran ini',
  saved: 'Ukuran tulisan diganti.',
  saveFailed: 'Gagal menyimpan ukuran tulisan',
} as const;

/** Button labels for the three sizes, smallest first (X1 D2: 1 / 1,25 / 1,5). */
export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  normal: 'Normal',
  besar: 'Besar',
  sangat_besar: 'Sangat besar',
};

export const NOTIFICATIONS_COPY = {
  title: 'Pemberitahuan',
  description: 'Pilih kabar yang muncul di Kotak masuk. Perubahan tersimpan langsung.',
  eventReminder: 'Ingatkan saya sebelum acara',
  eventReminderHint: 'Kartu pengingat satu hari dan setengah jam sebelum acara dimulai.',
  inboxNews: 'Tampilkan kabar terbaru di Kotak masuk',
  inboxNewsHint: 'Perubahan tugas, komentar, dan acara di proyek Anda.',
  always: 'Tugas yang perlu Anda tanggapi selalu tampil dan tidak bisa dimatikan.',
  saved: 'Pemberitahuan diperbarui.',
  saveFailed: 'Gagal menyimpan pemberitahuan',
} as const;

export const SIGN_OUT_COPY = {
  title: 'Keluar dari akun ini?',
  body: 'Kamu akan keluar dari akun ini. Kamu bisa masuk lagi kapan saja.',
  button: 'Keluar dari akun',
  confirm: 'Keluar',
  failed: 'Gagal keluar',
} as const;

export const ADVANCED_COPY = {
  title: 'Lanjutan',
  description: 'Perangkat yang masuk, riwayat masuk, dan kunci API.',
} as const;
