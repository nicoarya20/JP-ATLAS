// DUMMY: data hardcode untuk Inbox; ganti dengan data API saat modul notifikasi dibuat.
export type InboxItem = {
  id: string;
  /** First letter shown in the avatar. */
  actor: string;
  title: string;
  detail: string;
  project: string;
  /** Relative time text, e.g. "20 menit lalu". */
  when: string;
  actionLabel?: string;
  to: string;
  unread?: boolean;
};

/** Requests that need a reply; they can never be muted (see Pengaturan). */
export const NEEDS_ACTION: InboxItem[] = [
  {
    id: 'n1',
    actor: 'Nico',
    title: 'Nico mengembalikan tugas untuk diperbaiki',
    detail: '#12 Fix login SSO · "Tombol keluar belum jalan di Safari."',
    project: 'Proyek Atlas',
    when: '20 menit lalu',
    actionLabel: 'Lihat tugas',
    to: '/app/tasks/12',
    unread: true,
  },
  {
    id: 'n2',
    actor: 'Nico',
    title: 'Nico menunjuk Anda mengerjakan tugas baru',
    detail: '#14 Tulis spesifikasi API · Tenggat hari ini',
    project: 'Proyek Atlas',
    when: '2 jam lalu',
    actionLabel: 'Lihat tugas',
    to: '/app/tasks/14',
    unread: true,
  },
  {
    id: 'n3',
    actor: 'Rina',
    title: 'Rina menyebut Anda di tugas #12 Fix login SSO',
    detail: '"@Dodi tolong cek log SSO-nya."',
    project: 'Proyek Atlas',
    when: '2 jam lalu',
    actionLabel: 'Balas',
    to: '/app/tasks/12',
    unread: true,
  },
];

export const LATEST_NEWS: InboxItem[] = [
  {
    id: 'k1',
    actor: 'Rina',
    title: 'Rina menyelesaikan tugas #11 Susun wireframe checkout',
    detail: 'Status berubah menjadi Selesai.',
    project: 'Portal Klien PT Sinar',
    when: 'Kemarin',
    to: '/app/tasks/11',
  },
  {
    id: 'k2',
    actor: 'Dewi',
    title: 'Dewi mengundang Anda ke acara Latihan presentasi',
    detail: 'Selasa, 27 Okt · 15.00–16.00 · Ruang Rapat 3',
    project: 'Proyek Atlas',
    when: 'Kemarin',
    to: '/app/events',
  },
  {
    id: 'k3',
    actor: 'Agus',
    title: 'Agus mengubah tenggat proyek Proyek Atlas',
    detail: 'Tenggat diperpanjang menjadi 31 Okt.',
    project: 'Proyek Atlas',
    when: '2 hari lalu',
    to: '/app/projects/atlas',
  },
];
