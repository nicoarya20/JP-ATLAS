// Ending of every New project way (form, AI draft, template): no project is saved in Phase 1, like the prototype, which
// opens the Atlas overview; the modal closes onto the Projects tab first so Back from Atlas lands on the list.
import { router } from 'expo-router';

import { CREATE } from '../projects.strings';

/** The project the prototype opens after Create project. */
const OPENED = '/projects/atlas';

/** Close the New project modal, say "Project created" and open the project. */
export function createProject(notice: (message: string) => void) {
  notice(CREATE.created);
  router.dismissTo('/projects');
  router.push(OPENED);
}
