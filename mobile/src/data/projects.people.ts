// Projects ① people row: whose projects the list shows — My projects, or one teammate's. Ported from the prototype's
// projects.people.jsx; the pick lives in the list's route param `who` ('me' or a first name), so Back keeps it.
import { listPeople } from './people';
import type { ProjectItem } from './projects.state';

/** The `who` param of My projects. */
export const WHO_ME = 'me';

/** Projects in list that `who` belongs to: 'me' = `me` (a first name), else a teammate's first name; none = all. */
export function ofWho(list: readonly ProjectItem[], who: string | undefined, me: string) {
  const name = who === WHO_ME ? me : who;
  return name ? list.filter((p) => p.members.includes(name)) : [...list];
}

/** First names of everyone in a project of list except `me`, in the people order. */
export const teammates = (list: readonly ProjectItem[], me: string) =>
  listPeople()
    .map((p) => p.name)
    .filter((n) => n !== me && list.some((p) => p.members.includes(n)));

/** The line naming the pick: "My projects", "Rina's projects", or for a Member (shared ones only) "Projects with Rina". */
export function whoLabel(who: string, member: boolean) {
  if (who === WHO_ME) return 'My projects';
  return member ? `Projects with ${who}` : `${who}'s projects`;
}
