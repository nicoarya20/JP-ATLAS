/**
 * Curated catalogue of the `/app` features whose flag Super-admin switches in /dev (RD-09, plan
 * `P13-admin-data-nyata.md` §7). One source for the key, its Indonesian name, what it is, what
 * disappears when the flag goes off, and the default the catalogue documents. Both screens that
 * name a flag read it from here — the read-only Admin tab (`app/components/admin/settings/
 * fitur.panel.tsx`) and the key/value editor in /dev (`app/components/settings/FeatureFlagsCard
 * .tsx`) — so one key can never end up with two names.
 *
 * Exactly four keys, all of them `/app` features. `export` and `api-keys` stay out (plan §4 K5,
 * answered by the user 23 Okt 2026, §11 T1): the first is an Admin tool (/dashboard/export), the
 * second a Super-admin one (/dev/api-keys), so a switch on either could lock an operator out of
 * their own tool, and a list titled "fitur" would stop being about `/app`.
 *
 * ⚠️ No feature reads these flags yet. Real gating was RD-10 and it was dropped (plan §3 D5), so
 * `isFeatureEnabled()` has no caller among the features: `whenOff` says what gating *will* hide,
 * not what happens today, and a flag reading off disables nothing. A screen quoting this file must
 * therefore talk about the *flag status* and never claim "fitur ini mati" (plan §9 R3). The open
 * debt is H-G9 in `tahapan-proyek/05-implementasi/HUTANG.md`.
 */

export type FeatureCatalogEntry = {
  /** Flag key in `app_setting.feature_flags`; matches `FLAG_KEY_RE` in `settings-features.ts`. */
  key: string;
  /** Indonesian name, the only one any screen may show for this key. */
  label: string;
  /** One line: what the feature is. */
  description: string;
  /** One line: what leaves the screen once gating exists. Never phrased as today's behaviour. */
  whenOff: string;
  /** What the catalogue documents as the default for a key nobody has set yet. */
  defaultEnabled: boolean;
};

export const FEATURE_CATALOG: readonly FeatureCatalogEntry[] = [
  {
    key: 'leave',
    label: 'Cuti & izin',
    description:
      'Catatan cuti anggota, dipakai menu Tim untuk menandai siapa sedang tidak tersedia.',
    // Rewritten per plan §3 D7: leave approval leaves the app with P14, so "anggota tidak bisa
    // mengajukan cuti" would be wrong. The plan also names the "Setel cuti" menu in
    // /dashboard/users — that screen is P14's and does not exist in the code yet, so it is left
    // out rather than promised here. What is named below is on screen today:
    // `AvailabilityBadge` in /app/team and the Cuti card in /app/settings.
    whenOff:
      'Lencana Ketersediaan di menu Tim dan bagian Cuti di Pengaturan › Ketersediaan tidak lagi ditampilkan.',
    defaultEnabled: true,
  },
  {
    key: 'events',
    label: 'Kalender acara',
    description: 'Rapat dan tenggat sebagai acara tim, lengkap dengan peserta dan pengingat.',
    whenOff: 'Menu Events hilang dari /app; acara yang sudah tersimpan tidak dihapus.',
    defaultEnabled: true,
  },
  {
    key: 'trash',
    label: 'Sampah & pulihkan',
    description:
      'Proyek, tugas, dan acara yang dihapus mampir 30 hari di Sampah sebelum benar-benar hilang.',
    whenOff: 'Menu Sampah hilang dan setiap tombol Hapus kehilangan jaring pengamannya.',
    defaultEnabled: true,
  },
  {
    key: 'ask-data',
    label: 'Ask Data di Beranda',
    description: 'Beberapa pertanyaan tetap tentang data proyek sendiri, dijawab dari aturan.',
    whenOff: 'Kotak Ask Data di Beranda hilang; widget Beranda lain tetap tampil.',
    defaultEnabled: true,
  },
] as const;

export const FEATURE_CATALOG_KEYS: readonly string[] = FEATURE_CATALOG.map((f) => f.key);

/** The catalogue entry for a key, or `undefined` for a flag invented in the /dev editor. */
export function featureEntry(key: string): FeatureCatalogEntry | undefined {
  return FEATURE_CATALOG.find((f) => f.key === key);
}

/** Indonesian name for a key; a flag outside the catalogue has none, so the caller shows the key. */
export function featureLabel(key: string): string | undefined {
  return featureEntry(key)?.label;
}

export type FeatureStatus = FeatureCatalogEntry & {
  /** What `isFeatureEnabled()` answers today: a key missing from the settings row counts as off. */
  enabled: boolean;
  /** Nobody has saved this key in /dev yet, so `defaultEnabled` is only what the catalogue says. */
  unset: boolean;
};

/**
 * Catalogue order, with the status of each key read from the `features` map of `GET /api/settings`.
 * Flags outside the catalogue are ignored rather than listed — the catalogue decides what a
 * feature is, and a read-only screen must never be the thing that makes a stray flag look owned.
 */
export function readFeatureStatus(features?: Record<string, boolean> | null): FeatureStatus[] {
  return FEATURE_CATALOG.map((entry) => {
    const saved = features?.[entry.key];
    return { ...entry, enabled: saved === true, unset: typeof saved !== 'boolean' };
  });
}
