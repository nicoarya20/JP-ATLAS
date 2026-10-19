// DUMMY: proyek terhapus tampil sebagai item Sampah; ganti dengan daftar Sampah dari API saat S6 dibuat.
import type { TrashedProject } from '../projects/projects.logic';
import type { TrashItem } from './trash.dummy';

export const projectToItem = (p: TrashedProject): TrashItem => ({
  id: p.id,
  kind: 'project',
  title: p.name,
  project: p.name,
  deletedAt: p.deletedAt,
});
