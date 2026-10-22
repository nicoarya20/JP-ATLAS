/** Draws the loaded projects in the chosen view; filters and paging are the same for all of them. */
import type { ViewSlug } from '~/lib/projects-filters';
import { ProjectGantt } from './ProjectGantt';
import { ProjectGrid } from './ProjectGrid';
import { ProjectList } from './ProjectList';
import type { ProjectViewProps } from './ProjectMore';

export function ProjectResults({ view, ...props }: ProjectViewProps & { view: ViewSlug }) {
  if (view === 'gantt') return <ProjectGantt {...props} />;
  if (view === 'grid') return <ProjectGrid {...props} />;
  return <ProjectList {...props} />;
}
