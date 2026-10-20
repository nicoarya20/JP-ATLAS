/**
 * Ask Data without a model: three fixed questions answered from facts the page has already read.
 * The answer text comes from templates, so it can only say what the numbers say. Free-text questions
 * need a real assistant and are not offered.
 */
import { diffDays } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import type { ProjectCondition } from '../pm/enums';
import type { LoadFact, OverdueFact } from './home.ask.query';
import { ASK_COPY, ASK_QUESTIONS } from './home.copy';
import type { AskAnswer, AskBar, HomeProject } from './home.dto';

export type AskInput = {
  /** My running projects, as shown in "Proyek saya". */
  projects: readonly HomeProject[];
  overdue: OverdueFact | null;
  busiest: readonly LoadFact[];
  today: IsoDate;
};

const PERCENT_FULL = 100;
const CONDITION_RANK: Record<ProjectCondition, number> = { off_track: 0, at_risk: 1, on_track: 2 };
const NO_PERCENT = PERCENT_FULL + 1;

const percentOf = (p: HomeProject) => p.progress.percent ?? NO_PERCENT;

/** Most behind: worst condition first, then the lowest progress; projects without tasks cannot be judged. */
function mostBehind(projects: readonly HomeProject[]): HomeProject | undefined {
  return projects
    .filter((p) => p.progress.total > 0)
    .sort(
      (a, b) =>
        (a.condition ? CONDITION_RANK[a.condition] : 2) -
          (b.condition ? CONDITION_RANK[b.condition] : 2) ||
        percentOf(a) - percentOf(b) ||
        a.name.localeCompare(b.name),
    )[0];
}

function behind({ projects, today }: AskInput): AskAnswer {
  const key = 'behind';
  const question = ASK_QUESTIONS[key];
  const first = projects[0];
  if (!first) return { key, question, answer: ASK_COPY.noProjects, bars: [] };
  const worst = mostBehind(projects);
  const bars = projects.map(
    (p): AskBar => ({
      label: p.name,
      pct: p.progress.percent ?? 0,
      display: p.progress.percent === null ? ASK_COPY.noTasks : `${p.progress.percent}%`,
    }),
  );
  if (!worst) return { key, question, answer: ASK_COPY.behindNoTasks(first.name), bars };
  const dueIn = worst.dueDate ? diffDays(today, worst.dueDate) : null;
  return {
    key,
    question,
    answer: ASK_COPY.behind(worst.name, worst.progress.done, worst.progress.total, dueIn),
    bars,
  };
}

function stalled({ overdue, today }: AskInput): AskAnswer {
  const key = 'stalled';
  const question = ASK_QUESTIONS[key];
  if (!overdue) return { key, question, answer: ASK_COPY.noStalled, bars: [] };
  const days = diffDays(overdue.dueDate, today);
  return {
    key,
    question,
    answer: ASK_COPY.stalled(overdue.title, overdue.projectName, days),
    bars: [],
  };
}

function busiest({ busiest: people }: AskInput): AskAnswer {
  const key = 'busiest';
  const question = ASK_QUESTIONS[key];
  const top = people[0];
  if (!top) return { key, question, answer: ASK_COPY.noBusiest, bars: [] };
  return {
    key,
    question,
    answer: ASK_COPY.busiest(top.name, top.open),
    bars: people.map((p) => ({
      label: p.name,
      pct: Math.round((PERCENT_FULL * p.open) / top.open),
      display: ASK_COPY.tasks(p.open),
    })),
  };
}

/** The three answers in the order the suggestions are shown. */
export function composeAsk(input: AskInput): AskAnswer[] {
  return [behind(input), stalled(input), busiest(input)];
}
