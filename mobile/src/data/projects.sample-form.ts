/**
 * What the three *unbacked* New project steps read: the story ⑤, the draft the "AI" built from it ⑥,
 * and the templates ⑦.
 *
 * This is the one module of this wave still on sample data, and deliberately so: none of the three
 * has anything to read on the server.
 *
 * - **The story and its draft.** There is no endpoint that turns a paragraph into phases,
 *   milestones and tasks, and no LLM anywhere in this product (the briefing and Ask Data on the web
 *   side are rule-based for the same reason). The draft the screen shows is the prototype's worked
 *   example, kept so the step can be walked through.
 * - **The templates.** `project_template` does not exist in the schema; `PROJECT_TEMPLATES` is the
 *   prototype's fixture and has no route behind it.
 *
 * Keeping these in their own file, rather than in `projects.ts` beside the server-backed getters, is
 * the point: an import from here is a screen that does **not** talk to the server yet, and that is
 * visible at the import line instead of having to be traced. The form path ④, which does have a
 * server story, reads `getProjectForm()` from `projects.forms.ts` instead.
 *
 * All three steps are listed in `docs/phase2-gap-disembunyikan.md`.
 */
import { today } from './clock';
import { monthDay } from './dates';
import { me, person } from './people';
import { addDays, longDate, weekdayLongDate } from './projects.dates';
import { findProject } from './projects.state';
import type { Role } from './sample';
import { PROJECT_STORY, PROJECT_TEMPLATES, TEMPLATE_PROJECT } from './sample/projects.extra';

/** Full names of the people the story names, minus the signed-in one (prototype projects.parts.jsx helpers). */
const helpers = (role: Role) =>
  PROJECT_STORY.helpers.filter((k) => k !== me(role).key).map((k) => person(k)?.full ?? k);

/** New project ⑤–⑦: who creates it, the story and its draft, the templates. */
export function getProjectCreate(role: Role) {
  const creator = me(role);
  const s = PROJECT_STORY;
  const draftName = findProject(s.project)?.name ?? '';
  const tasks = s.phases.reduce((n, p) => n + p.tasks.length, 0);
  return {
    creator,
    helpers: helpers(role),
    today: today(),
    story: s.text,
    draft: {
      name: draftName,
      summary: s.summary,
      dates: `${monthDay(s.start)} – ${longDate(s.end)} (${s.months} months)`,
      members: `${creator.name} (Manager), ${helpers(role)
        .map((f) => f.split(' ')[0])
        .join(', ')}`,
      count: `${s.phases.length} phases · ${s.phases.length} milestones · ${tasks} tasks`,
      phases: s.phases,
    },
    templates: PROJECT_TEMPLATES.map((t) => ({
      ...t,
      meta: `${t.days} days · ${t.phases} phases · ${t.tasks} tasks · ${t.types} task types`,
    })),
    template: TEMPLATE_PROJECT,
  };
}

/** "Mon, Oct 12, 2026" and the estimated end of a project of `days` days starting then. */
export const templateDates = (start: string, days: number) => ({
  start: weekdayLongDate(start),
  end: `${weekdayLongDate(addDays(start, days))} (${days} days)`,
});
