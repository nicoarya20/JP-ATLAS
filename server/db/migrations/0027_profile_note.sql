-- Why: Profil mobile menampilkan catatan status singkat di samping foto (GAP P-1); kolom opsional agar akun lama tidak berubah.
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "note" text;