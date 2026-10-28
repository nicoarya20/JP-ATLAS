// The hidden New project ways still on the sample data in projects.store (story, AI draft, template; GAP A-16): every
// other Projects screen reads and writes the server (projects.api.ts, projects.view*.ts, projects.write.ts).
import { today } from './clock';
import { monthDay } from './dates';
import { me, person } from './people';
import { addDays, longDate, weekdayLongDate } from './projects.dates';
import { findProject } from './projects.store';
import type { Role } from './sample';
import { PROJECT_STORY, PROJECT_TEMPLATES, TEMPLATE_PROJECT } from './sample/projects.extra';

export { getProjectTasks } from './projects.detail';

/** Full names of the people the story names, minus the signed-in one (prototype projects.parts.jsx helpers). */
const helpers = (role: Role) =>
  PROJECT_STORY.helpers.filter((k) => k !== me(role).key).map((k) => person(k)?.full ?? k);

/** New project ③–⑦: who creates it, the story and its draft, the templates. */
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
