import { type Member, type TeamProject, VIEWER_CAN_MANAGE } from './team.dummy';

/** Workload counts are visible to the person themself, project managers and admins only. */
export function canSeeWorkload(m: Member, viewerCanManage = VIEWER_CAN_MANAGE): boolean {
  return Boolean(m.isMe) || viewerCanManage;
}

/** Projects narrowed by the project dropdown and the name search; empty projects are dropped. */
export function filterTeam(
  projects: readonly TeamProject[],
  project: string | null,
  q: string,
): TeamProject[] {
  const needle = q.trim().toLowerCase();
  return projects
    .filter((p) => !project || p.name === project)
    .map((p) => ({
      ...p,
      members: p.members.filter((m) => !needle || m.name.toLowerCase().includes(needle)),
    }))
    .filter((p) => p.members.length > 0);
}

/** Header line: "Proyek Atlas · 3 orang · 9 tugas aktif · 2 terlambat". */
export function summaryOf(p: TeamProject): string {
  const active = p.members.reduce((n, m) => n + m.active, 0);
  const late = p.members.reduce((n, m) => n + m.late, 0);
  return `${p.name} · ${p.members.length} orang · ${active} tugas aktif · ${late} terlambat`;
}
