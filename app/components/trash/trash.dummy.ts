// DUMMY: data hardcode untuk Sampah; ganti dengan data API saat Sampah S6 dibuat.
export type TrashKind = 'project' | 'task' | 'event';
export const TRASH_KIND_LABELS: Record<TrashKind, string> = {
  project: 'Proyek',
  task: 'Tugas',
  event: 'Event',
};
/** Items stay restorable this many days, then disappear for good. */
export const RETENTION_DAYS = 30;

export type TrashItem = {
  id: string;
  kind: TrashKind;
  title: string;
  project: string;
  /** `YYYY-MM-DD` the item was deleted. */
  deletedAt: string;
};

export const TRASH: TrashItem[] = [
  {
    id: 't1',
    kind: 'task',
    title: '#21 Tes duplikat login',
    project: 'Proyek Atlas',
    deletedAt: '2026-10-05',
  },
  {
    id: 't2',
    kind: 'event',
    title: 'Latihan presentasi lama',
    project: 'Proyek Atlas',
    deletedAt: '2026-10-02',
  },
];
