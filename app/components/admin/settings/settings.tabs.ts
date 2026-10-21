/**
 * The eight Setelan organisasi tabs of /dashboard/settings, in the order of P11 §4 ("Tab
 * Pengaturan"). This file is the shell only: every panel is a placeholder, and `owner` names the
 * task that replaces it — Identitas AD-04, Pengumuman AD-05, Akses masuk AD-06, Kebijakan kerja
 * AD-07, Pemberitahuan P9 G-02, Fitur AD-08, Peran & izin AD-09, Ekspor data AD-10. Nothing here
 * reads or writes settings yet, so no guard decision depends on it.
 */
import type { IconType } from 'react-icons';
import {
  FiBell,
  FiCalendar,
  FiDownload,
  FiLogIn,
  FiShield,
  FiTag,
  FiToggleLeft,
  FiVolume2,
} from 'react-icons/fi';

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
  description: 'Setelan organisasi: identitas aplikasi, akses masuk, kebijakan kerja, dan ekspor.',
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
    value: 'kebijakan-kerja',
    label: 'Kebijakan kerja',
    icon: FiCalendar,
    title: 'Hari kerja dan hari libur',
    description:
      'Hari kerja, daftar hari libur, pengingat acara bawaan, dan persetujuan cuti. Menyusul (AD-07).',
    owner: 'AD-07',
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
  {
    value: 'peran-izin',
    label: 'Peran & izin',
    icon: FiShield,
    title: 'Peran dan izin',
    description:
      'Matriks peran dan kemampuannya. Admin hanya membaca, Super-admin yang mengubah. Menyusul (AD-09).',
    owner: 'AD-09',
  },
  {
    value: 'ekspor-data',
    label: 'Ekspor data',
    icon: FiDownload,
    title: 'Ekspor data ke CSV',
    description: 'Unduhan CSV anggota, proyek, dan tugas; setiap ekspor diaudit. Menyusul (AD-10).',
    owner: 'AD-10',
  },
];

const FALLBACK_TAB = SETTINGS_TABS[0].value;

/** Reads `?tab=`; an unknown or missing value falls back to the first tab instead of a blank page. */
export function parseSettingsTab(value: string | null): string {
  return SETTINGS_TABS.some((t) => t.value === value) ? (value as string) : FALLBACK_TAB;
}
