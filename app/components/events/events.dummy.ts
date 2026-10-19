// DUMMY: data hardcode untuk Events; ganti dengan data API saat modul event dibuat.
export type EventKind = 'rapat' | 'acara';
export const KIND_LABELS: Record<EventKind, string> = { rapat: 'Rapat', acara: 'Acara' };

export type DummyEvent = {
  id: string;
  title: string;
  kind: EventKind;
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH.MM` */
  start: string;
  end: string;
  location: string;
  /** e.g. "tiap 2 minggu" for a repeating event. */
  repeat?: string;
  /** Meeting already happened today; shows "Lihat hasil". */
  finished?: boolean;
};

export const EVENTS: DummyEvent[] = [
  {
    id: 'e0',
    title: 'Retrospektif sprint 12',
    kind: 'rapat',
    date: '2026-10-09',
    start: '10.00',
    end: '11.00',
    location: 'Ruang Rapat 1',
    finished: true,
  },
  {
    id: 'e1',
    title: 'Rapat harian Atlas',
    kind: 'rapat',
    date: '2026-10-16',
    start: '09.00',
    end: '09.15',
    location: 'Online',
    finished: true,
  },
  {
    id: 'e2',
    title: 'Review desain onboarding',
    kind: 'rapat',
    date: '2026-10-16',
    start: '14.00',
    end: '15.00',
    location: 'Ruang Rapat 2',
  },
  {
    id: 'e3',
    title: 'Sprint review Atlas',
    kind: 'rapat',
    date: '2026-10-19',
    start: '13.00',
    end: '14.00',
    location: 'Ruang Rapat 1',
    repeat: 'tiap 2 minggu',
  },
  {
    id: 'e4',
    title: 'Latihan presentasi',
    kind: 'rapat',
    date: '2026-10-27',
    start: '15.00',
    end: '16.00',
    location: 'Ruang Rapat 3',
  },
  {
    id: 'e5',
    title: 'Syukuran ulang tahun kantor',
    kind: 'acara',
    date: '2026-10-29',
    start: '16.00',
    end: '17.00',
    location: 'Pantry lantai 3',
  },
];
