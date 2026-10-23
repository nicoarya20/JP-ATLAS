// Kanban status set: the board's columns in workflow order, and the side of the move menu each status sits on.
// The sides are fixed, so a status is always the same slide: To do up, In progress right, In review down, Done left.
import { Circle, CircleCheck, CircleDashed, CircleDot } from 'lucide-react';

/** [status, icon, tone class suffix (colour in tasks.css), move-menu side] per column. */
export const COLUMNS = [
  ['To do', CircleDashed, 'todo', 'up'],
  ['In progress', CircleDot, 'progress', 'right'],
  ['In review', Circle, 'review', 'down'],
  ['Done', CircleCheck, 'done', 'left'],
];
