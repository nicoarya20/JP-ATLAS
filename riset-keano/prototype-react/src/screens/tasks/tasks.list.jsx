// Tasks ①, ②, ④: My tasks (grouped by urgency), All tasks (Atlas, bulk select) and the empty state; Kanban ③ is in tasks.board.
// ① and ② show their screen params' Filter & sort query (tasks.query).
import { ChevronRight, List, ListChecks, Plus, SearchX, SquareKanban } from 'lucide-react';
import { Btn, Empty, Pill, Screen, Section, Seg } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { TasksSearch } from './tasks.filter';
import { Tick } from './tasks.parts';
import { SORTS, SORT_DUE, applyQuery, isFiltered, queryOf, queryParams, withoutQuery } from './tasks.query';
import { TODAY, days, detailOf, note } from './tasks.shared';

/** List frame shared by ①–④: My/All switch with the List/Kanban view beside it, search with the Filter & sort icon
 *  (status, project, priority, sort live in its overlay). The two switches are independent: Kanban keeps My/All
 *  (tasks.board with params.mine) and My/All keeps the Kanban view. List/Kanban keeps the query; My/All starts the
 *  other list's own default (they scope projects differently).
 *  New task lives on the tab bar's round "+" button, so the nav bar stays a plain title. */
export function ListScreen({ mine, board, children }) {
  const { go, params } = useApp();
  const open = (my, kanban) => {
    const q = !!my === !!mine ? queryParams(params) : {};
    if (kanban) go('tasks.board', { params: my ? { ...q, mine: true } : q });
    else go(my ? 'tasks.my' : 'tasks.all', { params: q });
  };
  return (
    <Screen title="Tasks" tab="tasks">
      <div className="tk-filters">
        <div className="tk-switch">
          <div className="grow"><Seg items={['My tasks', 'All tasks']} on={mine ? 0 : 1} onPick={i => open(i === 0, board)} /></div>
          <div className="tk-seg"><Seg items={['List', 'Kanban']} icons={[<List size={18} aria-hidden="true" />, <SquareKanban size={18} aria-hidden="true" />]}
            on={board ? 1 : 0} onPick={i => open(mine, i === 1)} /></div>
        </div>
        <TasksSearch mine={mine} />
      </div>
      {children}
    </Screen>
  );
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

/** ① Card: opens the task; its actions (Start working, Request review, Review) live in the detail. */
function MyCard({ t }) {
  const late = days(t.due) < 0;
  return (
    <Section go={detailOf(t)} task={t.no}>
      <div className="stack xs">
        <CardTitle>{t.title}</CardTitle>
        <span className="t-footnote muted">#{t.no} · {t.project} · {t.priority}</span>
        {t.status !== 'To do' && <span className="t-footnote bold">{note(t)}</span>}
        <span className={`t-footnote tk-meta ${late ? 'danger bold' : 'muted'}`}>Due {t.due}</span>
      </div>
    </Section>
  );
}

const GROUPS = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'Done'];
const weekLeft = (7 - TODAY.getDay()) % 7;
const groupOf = t => { const d = days(t.due); return t.status === 'Done' ? 5 : d < 0 ? 0 : d <= 1 ? d + 1 : d <= weekLeft ? 3 : 4; };

/** Shown when the query leaves a list empty: Reset filters re-opens the list with its default query. */
function NoMatch() {
  const { current, params, go } = useApp();
  return (
    <Empty icon={<SearchX size={28} role="img" aria-label="No matches" />} title="No tasks match these filters."
      text="Change the filters, or reset them to see the whole list."
      action={<Btn kind="primary" onClick={() => go(current, { params: withoutQuery(params) })}>Reset filters</Btn>} />
  );
}

/** ① My tasks. Manager reviews the queue; Admin may review any task. Everyone else sees only their own tasks.
 *  Sorted by due date the list is grouped by urgency; any other sort is one list in that order. */
export function TasksMy({ params }) {
  const { is } = useApp();
  const q = queryOf(params, true);
  const review = is('member') ? [] : applyQuery(D.tasks.filter(t => t.status === 'In review'), q);
  const own = applyQuery(D.tasks.filter(t => t.who === D.me().name && !review.includes(t)), q);
  const groups = q.sort === SORT_DUE
    ? GROUPS.map((g, i) => [g, own.filter(t => groupOf(t) === i)]).filter(([, list]) => list.length)
    : own.length ? [[SORTS[q.sort], own]] : [];
  if (review.length) groups.unshift([is('pm') ? 'Waiting for my review' : 'Waiting for review', review]);
  return (
    <ListScreen mine>
      {!groups.length && isFiltered(q) && <NoMatch />}
      {groups.map(([g, list]) => [
        <h2 key={g} className="t-headline tk-group">{g}<span className="muted">{list.length}</span></h2>,
        ...list.map(t => <MyCard key={t.no} t={t} />),
      ])}
    </ListScreen>
  );
}

/** ② All tasks — checkbox for bulk select, card opens the detail. Scoped to the Atlas project until the filter changes it. */
export function TasksAll({ params }) {
  const q = queryOf(params, false);
  const list = applyQuery(D.tasks, q);
  return (
    <ListScreen>
      {!list.length && <NoMatch />}
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
      {list.length > 0 && <p className="t-footnote muted">1–{list.length} of {list.length} tasks · {D.project(q.project)?.name || 'All projects'}</p>}
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
