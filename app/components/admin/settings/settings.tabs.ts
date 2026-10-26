/**
 * The five Setelan organisasi tabs of /dashboard/settings, in the order of P11 §4 ("Tab
 * Pengaturan") minus the three taken out: AD-20 moved Peran & izin to a report
 * (/dashboard/permissions) and Ekspor data to a tool (/dashboard/export), so neither is a
 * setting, and P14 D1 dropped Kebijakan kerja because nothing in the code reads a working day
 * yet — working days and holidays come back with the deadline calculator that needs them, and
 * the leave approval switch went away with approval itself (P14 §4 K1/K6). This file is the
 * shell only: every panel is a placeholder, and `owner` names the task that replaces it —
 * Identitas AD-04, Pengumuman AD-05, Akses masuk AD-06, Pemberitahuan P9 G-02, Fitur AD-08.
 * Nothing here reads or writes settings yet, so no guard decision depends on it.
 */
import type { IconType } from 'react-icons';
import { FiBell, FiLogIn, FiTag, FiToggleLeft, FiVolume2 } from 'react-icons/fi';

export type SettingsTab = {
  /** Also the `?tab=` value, so every tab is linkable. */
  value: string;
  label: string;
  icon: IconType;
  /** Placeholder heading: what this tab will hold. */
  title: string;
  /** Placeholder body: what the operator will be able to do, and which task delivers it. */
  description: string;
  /** Task that fills this panel. Kept in the data so the placeholder can never go unlabelled. */
  owner: string;
};

export const SETTINGS_PAGE_COPY = {
  title: 'Pengaturan',
  description: 'Setelan organisasi: identitas aplikasi, pengumuman, akses masuk, dan fitur.',
  tabsLabel: 'Kelompok pengaturan',
} as const;

export const SETTINGS_TABS: readonly SettingsTab[] = [
  {
    value: 'identitas',
    label: 'Identitas',
    icon: FiTag,
    title: 'Identitas aplikasi',
    description:
      'Nama aplikasi, tagline, dan tautan bantuan diatur di sini. Formulirnya menyusul (AD-04).',
    owner: 'AD-04',
  },
  {
    value: 'pengumuman',
    label: 'Pengumuman',
    icon: FiVolume2,
    title: 'Pengumuman untuk semua orang',
    description:
      'Banner yang tampil di seluruh area login-an dan bisa ditutup pembacanya. Menyusul (AD-05).',
    owner: 'AD-05',
  },
  {
    value: 'akses-masuk',
    label: 'Akses masuk',
    icon: FiLogIn,
    title: 'Cara orang masuk',
    description:
      'Formulir pendaftaran, kewajiban persetujuan admin, dan undangan. Menyusul (AD-06).',
    owner: 'AD-06',
  },
  {
    value: 'pemberitahuan',
    label: 'Pemberitahuan',
    icon: FiBell,
    title: 'Saklar pemberitahuan',
    description:
      'Jenis pemberitahuan yang dikirim aplikasi. Tempatnya sudah disiapkan, isinya datang dari tugas P9 G-02.',
    owner: 'P9 G-02',
  },
  {
    value: 'fitur',
    label: 'Fitur',
    icon: FiToggleLeft,
    title: 'Fitur yang dinyalakan',
    description:
      'Daftar fitur terkurasi beserta penjelasannya — bukan editor key/value. Menyusul (AD-08).',
    owner: 'AD-08',
  },
];

const FALLBACK_TAB = SETTINGS_TABS[0].value;

/** Reads `?tab=`; an unknown or missing value falls back to the first tab instead of a blank page. */
export function parseSettingsTab(value: string | null): string {
  return SETTINGS_TABS.some((t) => t.value === value) ? (value as string) : FALLBACK_TAB;
}
