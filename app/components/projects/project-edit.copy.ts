/** Indonesian copy for "Ubah proyek" (S1-13); the shared field labels stay in `FORM_COPY`. */
import { LABEL_LEAD } from './projects.copy';

export const EDIT_COPY = {
  title: 'Ubah proyek',
  description: 'Ubah nama, deskripsi, prioritas, tanggal, status, atau Pengelola utama proyek ini.',
  forbidden: 'Hanya pengelola proyek ini dan Admin yang boleh mengubah proyek.',
  status: 'Status',
  statusHint: 'Status boleh dipindah ke mana saja, termasuk dari Selesai kembali ke Berjalan.',
  leadHint: `Hanya Pengelola proyek ini yang bisa dijadikan ${LABEL_LEAD}. Tambahkan Pengelola di tab Anggota.`,
  submit: 'Simpan perubahan',
} as const;
