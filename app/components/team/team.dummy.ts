// DUMMY: data hardcode untuk Tim; ganti dengan data API saat modul tim dibuat.
export type Member = {
  name: string;
  /** "Pengelola" can see everyone's workload; "Anggota" only their own. */
  role: 'Pengelola' | 'Anggota';
  lead?: boolean;
  isMe?: boolean;
  /** Text when away, e.g. "Cuti diajukan 14–16 Okt"; undefined means available. */
  away?: string;
  active: number;
  late: number;
};
export type TeamProject = { name: string; members: Member[] };

/** The signed-in viewer is a plain member in the dummy world. */
export const VIEWER_CAN_MANAGE = false;

export const TEAM_PROJECTS: TeamProject[] = [
  {
    name: 'Proyek Atlas',
    members: [
      {
        name: 'Dodi',
        role: 'Anggota',
        isMe: true,
        away: 'Cuti diajukan 14–16 Okt',
        active: 3,
        late: 1,
      },
      { name: 'Nico', role: 'Pengelola', lead: true, active: 2, late: 0 },
      { name: 'Rina', role: 'Anggota', active: 4, late: 1 },
    ],
  },
  {
    name: 'Portal Klien PT Sinar',
    members: [
      { name: 'Rina', role: 'Pengelola', lead: true, active: 3, late: 1 },
      {
        name: 'Dodi',
        role: 'Anggota',
        isMe: true,
        away: 'Cuti diajukan 14–16 Okt',
        active: 1,
        late: 0,
      },
      { name: 'Budi', role: 'Anggota', active: 2, late: 0 },
    ],
  },
];
