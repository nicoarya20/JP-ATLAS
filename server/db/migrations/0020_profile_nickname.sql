-- Why: Pengaturan > Ubah profil memakai Nama panggilan untuk sapaan Beranda; kolom opsional agar akun lama tidak berubah.
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "nickname" text;