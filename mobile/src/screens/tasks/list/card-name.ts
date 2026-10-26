// What a screen reader hears for a task card (W1e): the card is one button, so its name carries what the card shows,
// in reading order, plus the parts a sighted person gets from the card's place (status, assignee, steps).
import type { TaskCard } from '@/data/tasks';

import { S } from '../tasks.strings';
import { SPOKEN, spoken } from '../tasks.strings.added';

type CardNameOptions = {
  /** The project (My tasks) or the type (All tasks, the team board) the card shows under its title. */
  place: string;
  /** The card shows its date red, with "N days late". */
  late: boolean;
  /** The card shows its note. */
  note: boolean;
};

/** "#12 Fix login layout, Website, High, In progress, <note>, Due Oct 5, 2 days late, Nico Pratama +1, Steps 1/3". */
export const cardName = (t: TaskCard, { place, late, note }: CardNameOptions) =>
  spoken(
    `#${t.no} ${t.title}`,
    place,
    t.priority,
    t.status,
    note && t.note,
    S.due(t.due),
    late && t.lateBy,
    t.whoLabel,
    t.steps && SPOKEN.steps(t.steps),
  );
