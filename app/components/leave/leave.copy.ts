/** Indonesian copy for the leave UI: Ketersediaan on /app/settings and the Inbox rejection dialog. */

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

/**
 * The Inbox rejection dialog below is the last piece of the old approval flow still standing; it
 * leaves with the `leave_requested` notification kind in P14 CU-06. Its limit used to be validated
 * on the server; with that route gone it is only the counter under the field.
 */
export const LEAVE_REJECT_REASON_MAX = 300;

export const LEAVE_REJECT_COPY = {
  title: (name: string) => `Tolak cuti ${name}?`,
  impact:
    'Pemohon dikabari bahwa pengajuannya ditolak, lengkap dengan alasan bila Anda menulisnya.',
  reason: 'Alasan (boleh kosong)',
  reasonPlaceholder: 'Mis. tenggat proyek jatuh di tanggal itu',
  counter: (used: number, max: number) => `${used}/${max}`,
  tooLong: (max: number) => `Alasan paling banyak ${max} karakter.`,
  submit: 'Tolak pengajuan',
  cancel: 'Batal',
  done: (name: string) => `Cuti ${name} ditolak.`,
} as const;
