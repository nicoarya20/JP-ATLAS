import { useOutletContext } from 'react-router';
import type { DummyProjectAccess } from './projects.access';
import type { ProjectRecord } from './projects.logic';

/** What the project layout hands to its tabs: the live project, what the viewer may do, and who they are. */
export type ProjectOutlet = {
  project: ProjectRecord;
  access: DummyProjectAccess;
  /** The viewer's name in the dummy world, written on every activity line they cause. */
  viewer: string;
};

export const useProjectOutlet = () => useOutletContext<ProjectOutlet>();
