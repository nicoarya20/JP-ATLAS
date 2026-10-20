/** Indonesian copy for the account settings page (/app/settings), kept out of the components. */
import type { TextSize } from '@server/pm/enums';

export const SETTINGS_TITLE = 'Pengaturan';
export const SETTINGS_INTRO = 'Atur akun, tampilan, dan pemberitahuan Anda.';

export const ACCOUNT_COPY = {
  section: 'Akun saya',
  edit: 'Ubah profil',
  noJobTitle: 'Jabatan dan divisi belum diisi',
  phoneLabel: 'HP',
} as const;

export const PROFILE_FORM_COPY = {
  title: 'Ubah profil',
  back: 'Kembali ke Pengaturan',
  changePhoto: 'Ganti foto',
  name: 'Nama lengkap',
  nameHint: 'Kosongkan untuk memakai nama dari akun Anda.',
  nickname: 'Nama panggilan (untuk sapaan)',
  nicknameHint: 'Dipakai di sapaan Beranda, mis. "Selamat pagi, Nico".',
  jobTitle: 'Jabatan',
  department: 'Divisi',
  phone: 'Nomor HP (tidak wajib)',
  phoneHint: 'Hanya Anda dan Admin yang bisa melihat nomor ini.',
  email: 'Email',
  emailHint: 'Email adalah identitas akun Anda dan tidak bisa diubah di sini.',
  cancel: 'Batal',
  save: 'Simpan',
  saved: 'Profil disimpan.',
  saveFailed: 'Gagal menyimpan profil',
} as const;

export const APPEARANCE_COPY = {
  title: 'Tampilan',
  sizeTitle: 'Ukuran teks',
  description: 'Pilih ukuran yang paling nyaman dibaca. Berlaku di semua layar.',
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
  on: 'Hidup',
  off: 'Mati',
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
  button: 'Keluar',
  confirm: 'Keluar',
  failed: 'Gagal keluar',
} as const;

export const ADVANCED_COPY = {
  title: 'Keamanan dan perangkat',
  description: 'Kata sandi, perangkat yang sedang masuk, riwayat masuk, dan kunci API.',
} as const;

export const DELETE_ACCOUNT_COPY = {
  cardTitle: 'Hapus akun',
  cardDescription: 'Tindakan di sini tidak bisa dibatalkan.',
  cardBody:
    'Menghapus akun Anda, semua perangkat yang masuk, dan akun tertaut. Log aktivitas anonim tetap tersimpan untuk keperluan audit.',
  open: 'Hapus akun saya…',
  checkFailed: 'Gagal memeriksa akun',
  modalTitle: 'Hapus akun permanen?',
  impact:
    'Anda tidak bisa masuk lagi. Tugas yang Anda kerjakan menjadi tanpa penanggung jawab, keanggotaan Anda di proyek dan acara dicabut, dan kartu Kotak masuk Anda dihapus. Komentar dan riwayat yang pernah Anda tulis tetap ada.',
  typeEmail: 'Ketik email Anda untuk memastikan:',
  password: 'Password',
  cancel: 'Batal',
  confirm: 'Hapus akun saya',
  failed: 'Gagal menghapus akun',
  failedFallback: 'Server menolak. Coba masuk ulang lalu ulangi.',
  blockedTitle: 'Akun belum bisa dihapus',
  blockedBody:
    'Anda satu-satunya pengelola proyek berikut. Tunjuk pengelola lain dulu, lalu kembali ke sini.',
  blockedMore: (n: number) => `Dan ${n} proyek lain.`,
  understood: 'Mengerti',
} as const;
