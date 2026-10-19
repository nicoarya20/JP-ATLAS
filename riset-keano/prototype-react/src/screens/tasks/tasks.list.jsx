// Tasks ①, ②, ④: My tasks (grouped by urgency), All tasks (Atlas, bulk select) and the empty state; Kanban ③ is in tasks.board.
import { ChevronRight, List, ListChecks, Plus, SquareKanban } from 'lucide-react';
import { Btn, Empty, Pill, Screen, Search, Section, Seg } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { FilterButton } from './tasks.filter';
import { Tick } from './tasks.parts';
import { TODAY, atlas, atlasTasks, blocked, days, detailOf, note } from './tasks.shared';

/** List frame shared by ①–④: My/All switch with the List/Kanban view beside it, search with the Filter & sort icon
 *  (status, project, priority, sort live in its overlay). The two switches are independent: Kanban keeps My/All
 *  (tasks.board with params.mine) and My/All keeps the Kanban view.
 *  New task lives on the tab bar's round "+" button, so the nav bar stays a plain title. */
export function ListScreen({ mine, board, children }) {
  const { go } = useApp();
  const open = (my, kanban) => (kanban ? go('tasks.board', { params: my ? { mine: true } : {} }) : go(my ? 'tasks.my' : 'tasks.all'));
  return (
    <Screen title="Tasks" tab="tasks">
      <div className="tk-filters">
        <div className="tk-switch">
          <div className="grow"><Seg items={['My tasks', 'All tasks']} on={mine ? 0 : 1} onPick={i => open(i === 0, board)} /></div>
          <div className="tk-seg"><Seg items={['List', 'Kanban']} icons={[<List size={18} aria-hidden="true" />, <SquareKanban size={18} aria-hidden="true" />]}
            on={board ? 1 : 0} onPick={i => open(mine, i === 1)} /></div>
        </div>
        <div className="tk-search">
          <div className="grow"><Search placeholder="Search title, #number, or tag…" /></div>
          <FilterButton project={mine ? undefined : atlas().id} />
        </div>
      </div>
      {children}
    </Screen>
  );
}

// ① Card button = next action for its status, or none when the only thing to do is open the task (the card itself does that).
// Member: their own task waiting on a reviewer has no action.
function action(t, member) {
  if (t.status === 'In review') return member ? null : ['Review', { go: 'tasks.detail-review', task: t.no }];
  if (blocked(t)) return null;
  if (t.status === 'In progress') return ['Request review', { toast: 'Review requested' }];
  return ['Start working', { toast: 'Task started' }];
}

/** Title row of a tappable card: the title wraps, a chevron says the card opens. */
function CardTitle({ children }) {
  return (
    <div className="row-flex tk-top">
      <span className="t-headline grow">{children}</span>
      <ChevronRight size={18} className="muted tk-chev" aria-hidden="true" />
    </div>
  );
}

function MyCard({ t }) {
  const a = action(t, useApp().is('member'));
  const late = days(t.due) < 0;
  return (
    <Section go={detailOf(t)} task={t.no}>
      <div className="stack xs">
        <CardTitle>{t.title}</CardTitle>
        <span className="t-footnote muted">#{t.no} · {t.project} · {t.priority}</span>
        {(t.status !== 'To do' || blocked(t)) && <span className="t-footnote bold">{note(t)}</span>}
        <div className="between tk-meta">
          <span className={`t-footnote ${late ? 'danger bold' : 'muted'}`}>Due {t.due}</span>
          {a && <Btn sm {...a[1]}>{a[0]}</Btn>}
        </div>
      </div>
    </Section>
  );
}

const GROUPS = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later'];
const weekLeft = (7 - TODAY.getDay()) % 7;
const groupOf = t => { const d = days(t.due); return d < 0 ? 0 : d <= 1 ? d + 1 : d <= weekLeft ? 3 : 4; };

/** ① My tasks. Manager reviews the queue; Admin may review any task. Everyone else sees only their own open tasks. */
export function TasksMy() {
  const { is } = useApp();
  const review = is('member') ? [] : D.tasks.filter(t => t.status === 'In review');
  const own = D.tasks.filter(t => t.who === D.me().name && t.status !== 'Done' && !review.includes(t));
  const groups = GROUPS.map((g, i) => [g, own.filter(t => groupOf(t) === i)]).filter(([, list]) => list.length);
  if (review.length) groups.unshift([is('pm') ? 'Waiting for my review' : 'Waiting for review', review]);
  return (
    <ListScreen mine>
      {groups.map(([g, list]) => [
        <h2 key={g} className="t-headline tk-group">{g}<span className="muted">{list.length}</span></h2>,
        ...list.map(t => <MyCard key={t.no} t={t} />),
      ])}
    </ListScreen>
  );
}

/** ② All tasks — checkbox for bulk select, card opens the detail. Filtered to the Atlas project. */
export function TasksAll() {
  const list = atlasTasks();
  return (
    <ListScreen>
      {list.map(t => (
        <Section key={t.no} go={detailOf(t)} task={t.no}>
          <div className="row-flex tk-top">
            <Tick />
            <div className="stack xs grow">
              <CardTitle>{t.title}</CardTitle>
              <span className="t-footnote muted">#{t.no} · {t.type} · {D.person(t.who).full}</span>
              <span className="t-footnote bold">{note(t)}</span>
              <div className="between tk-meta">
                <Pill tone={t.status === 'Done' ? 'neutral' : 'outline'}>{t.status}</Pill>
                <span className="t-footnote muted">Due {t.due}</span>
              </div>
            </div>
          </div>
        </Section>
      ))}
      <p className="t-footnote muted">1–{list.length} of {list.length} tasks · {atlas().name}</p>
    </ListScreen>
  );
}

/** ④ My tasks empty — still offers New task. */
export function TasksEmpty() {
  return (
    <ListScreen mine>
      <Empty icon={<ListChecks size={28} role="img" aria-label="No tasks" />} title="No tasks for you yet."
        text="Tasks assigned to you will show up here." action={<Btn kind="primary" icon={<Plus size={18} />} go="tasks.write">New task</Btn>} />
    </ListScreen>
  );
}
