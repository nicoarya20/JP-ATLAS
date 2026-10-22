import { FiClock, FiShield, FiSlash, FiUserPlus, FiUsers, FiZap } from 'react-icons/fi';
import type { UserStats } from '~/lib/admin-users-api';
import { StatTileGrid, type StatTileProps } from '../logs/StatTile';

const nf = new Intl.NumberFormat('id-ID');

export function UserStatsCards({ stats }: { stats: UserStats | undefined }) {
  const tiles: StatTileProps[] | undefined = stats && [
    { label: 'Total pengguna', value: nf.format(stats.total), hint: 'semua akun', icon: FiUsers },
    {
      label: 'Menunggu persetujuan',
      value: nf.format(stats.pending),
      hint: stats.pending > 0 ? 'perlu keputusan Admin' : 'tidak ada antrean',
      icon: FiClock,
      color: stats.pending > 0 ? 'yellow' : 'gray',
    },
    {
      label: 'Aktif 24 jam',
      value: nf.format(stats.active24h),
      hint: 'pengguna yang masuk hari ini',
      icon: FiZap,
      color: 'cyan',
    },
    {
      label: 'Baru 7 hari',
      value: nf.format(stats.new7d),
      hint: 'pendaftaran seminggu terakhir',
      icon: FiUserPlus,
      color: 'teal',
    },
    {
      label: 'Admin',
      value: nf.format(stats.admins + stats.superAdmins),
      hint: `${nf.format(stats.superAdmins)} super-admin`,
      icon: FiShield,
      color: 'grape',
    },
    {
      label: 'Diblokir',
      value: nf.format(stats.banned),
      hint: stats.banned > 0 ? 'perlu ditinjau berkala' : 'tidak ada',
      icon: FiSlash,
      color: stats.banned > 0 ? 'red' : 'gray',
    },
  ];
  return <StatTileGrid tiles={tiles} />;
}
