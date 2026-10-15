// Tasks ①–④: My tasks (grouped by urgency), All tasks (Atlas, bulk select), Board (status columns) and the empty state.
import { ListChecks } from 'lucide-react';
import { Avatar, Btn, Chips, Empty, Pill, Screen, Search, Section, Seg, Select } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Tick } from './tasks.parts';
import { TODAY, atlas, atlasTasks, blocked, days, detailOf, note } from './tasks.shared';

/** List frame shared by ①–④: New task button, My/All switch, search, status chips, filter/view row, sort row. */
function ListScreen({ all, board, children }) {
  return (
    <Screen title="Tasks" right={<Btn kind="primary" sm go="tasks.write">+ New task</Btn>} tab="tasks">
      <Seg items={['My tasks', 'All tasks']} on={all ? 1 : 0} gos={['tasks.my', 'tasks.all']} />
      <Search placeholder="Search title, #number, or tag…" />
      <Chips items={['All active', 'To do', 'In progress', 'In review', 'Done']} />
      <div className="between">
        <div className="row-flex">
          {all && <Pill>Project: {atlas().name.split(' ')[0]} ✕</Pill>}
          <Select toast="Filter options">Filter</Select>
        </div>
        <div className="tk-seg"><Seg items={['List', 'Board']} on={board ? 1 : 0} gos={['tasks.all', 'tasks.board']} /></div>
      </div>
      <div className="between">
        <Select toast="Sort options">Sort: Due</Select>
        {all && (
          <span className="row-flex">
            <Btn kind="ghost" sm toast="CSV downloaded">Download CSV</Btn>
            <Btn kind="ghost" sm go="tasks.csv">Import CSV</Btn>
          </span>
        )}
      </div>
      {children}
    </Screen>
  );
}

// ① Card button = next action for its status. Member: their own task waiting on a reviewer only offers View.
function action(t, member) {
  if (t.status === 'In review') return [member ? 'View' : 'Review', { go: 'tasks.detail-review', task: t.no }];
  if (blocked(t)) return ['View', { go: detailOf(t), task: t.no }];
  if (t.status === 'In progress') return ['Request review', { toast: 'Review requested' }];
  return ['Start working', { toast: 'Task started' }];
}

function MyCard({ t }) {
  const [label, nav] = action(t, useApp().is('member'));
  return (
    <Section go={detailOf(t)} task={t.no}>
      <div className="stack sm">
        <span className="t-headline">{t.title}</span>
        <span className="t-footnote muted">#{t.no} · {t.project} · {t.priority}</span>
        <div className="between tk-end">
          <span className="stack xs">
            {(t.status !== 'To do' || blocked(t)) && <span className="t-footnote bold">{note(t)}</span>}
            <span className="t-footnote muted">Due {t.due}</span>
          </span>
          <Btn kind="primary" sm {...nav}>{label}</Btn>
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
    <ListScreen>
      {groups.map(([g, list]) => [
        <h2 key={g} className="t-headline tk-group">{g} <span className="muted">{list.length}</span></h2>,
        ...list.map(t => <MyCard key={t.no} t={t} />),
      ])}
    </ListScreen>
  );
}

/** ② All tasks — checkbox for bulk select, card opens the detail. Filtered to the Atlas project. */
export function TasksAll() {
  const list = atlasTasks();
  return (
    <ListScreen all>
      {list.map(t => (
        <Section key={t.no} go={detailOf(t)} task={t.no}>
          <div className="row-flex tk-top">
            <Tick />
            <div className="stack xs grow">
              <span className="row-flex"><span className="t-footnote muted bold">#{t.no}</span><span className="t-headline">{t.title}</span></span>
              <span className="t-footnote muted">{t.type} · {D.person(t.who).full} · Due {t.due}</span>
              <div><Pill tone={t.status === 'Done' ? 'neutral' : 'outline'}>{t.status}</Pill></div>
              <span className="t-footnote bold">{note(t)}</span>
            </div>
          </div>
        </Section>
      ))}
      <p className="t-footnote muted">1–{list.length} of {list.length} tasks · {atlas().name}</p>
    </ListScreen>
  );
}

// ③ Member: other people's cards (and their own task in review) only open the detail.
function boardAction(t, member) {
  if (t.status === 'Done') return null;
  const go = detailOf(t);
  if (blocked(t) || (member && (t.who !== D.me().name || t.status === 'In review'))) return ['View →', { go, task: t.no }];
  if (t.status === 'In review') return ['Review →', { go: 'tasks.detail-review', task: t.no }];
  if (t.status === 'In progress') return ['Request review →', { go: 'tasks.detail-review' }];
  return ['Start working →', { toast: 'Task started' }];
}

function BoardCard({ t }) {
  const a = boardAction(t, useApp().is('member'));
  return (
    <Section go={detailOf(t)} task={t.no}>
      <div className="stack sm">
        <span className="t-footnote muted bold">#{t.no}</span>
        <span className="t-headline">{t.title}</span>
        <span className="t-footnote muted">{t.type} · {t.priority}</span>
        <span className="t-footnote bold">{note(t)}</span>
        <span className="row-flex t-footnote"><Avatar name={t.who} size="sm" />{t.who}</span>
        {a && <Btn sm block {...a[1]}>{a[0]}</Btn>}
      </div>
    </Section>
  );
}

/** ③ Board — one status column per screen width, the next column peeks; swipe to move. */
export function TasksBoard() {
  return (
    <ListScreen all board>
      <div className="tk-board">
        {['To do', 'In progress', 'In review', 'Done'].map(s => {
          const list = atlasTasks().filter(t => t.status === s);
          return (
            <section key={s} className="tk-col">
              <h3 className="t-headline">{s} <span className="muted">{list.length}</span></h3>
              {list.map(t => <BoardCard key={t.no} t={t} />)}
            </section>
          );
        })}
      </div>
    </ListScreen>
  );
}

/** ④ My tasks empty — still offers + New task. */
export function TasksEmpty() {
  return (
    <ListScreen>
      <Empty icon={<ListChecks size={28} role="img" aria-label="No tasks" />} title="No tasks for you yet."
        text="Tasks assigned to you will show up here." action={<Btn kind="primary" go="tasks.write">+ New task</Btn>} />
    </ListScreen>
  );
}
