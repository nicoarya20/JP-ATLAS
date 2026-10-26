/** Indonesian copy for the leave UI: the read-only Ketersediaan card on /app/settings. */

export const LEAVE_COPY = {
  availabilityTitle: 'Ketersediaan',
  cardTitle: 'Cuti',
  here: 'Tidak sedang cuti. Rekan melihat Anda sebagai Tersedia.',
  onLeaveBadge: 'Sedang cuti',
  onLeave: (until: string) => `Cuti sampai ${until}.`,
  /**
   * P14 §8 R4: the Ajukan cuti button is gone, and a part that simply disappears reads as a broken
   * app. This sentence says where leave is handled instead, so nobody looks for the missing button.
   */
  whereToApply: 'Pengajuan cuti diurus lewat HRD atau atasanmu, bukan di aplikasi ini.',
  seenByTeam: 'Rekan satu tim melihat status ini di menu Tim.',
} as const;
