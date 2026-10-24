// Tasks ⑧–⑩ shared detail layout: header block, key/value facts, sections, history, and a pinned comment bar.
import { Avatar, Btn, Media, Menu, Pill, Section, StatusPill } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Foot, FootScreen, Sec, Tick } from './tasks.parts';
import { assigned, assignees, days, detailOf, info } from './tasks.shared';
import { archiveTask, moveTask, useTaskMoves } from './tasks.store';

const dueLabel = t => {
  const d = days(t.due);
  return t.status === 'Done' || t.status === 'Canceled' ? t.when : d < 0 ? `Overdue ${-d} days` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `Due ${t.due}`;
};
const dueNote = t => {
  const d = days(t.due);
  return t.status === 'Done' || t.status === 'Canceled' ? '' : d < 0 ? `(${-d} days late)` : d === 0 ? '(today)' : d === 1 ? '(tomorrow)' : '';
};

/** Step checklist title: "Steps 2/3", or "Steps" when there are none. */
export const stepsTitle = list => (list.length ? `Steps ${list.filter(s => s[1]).length}/${list.length}` : 'Steps');

export function Step({ step: [text, on] }) {
  return <span className="t-subhead"><Tick on={on} label={text} /></span>;
}

export function Evidence({ proof: [file, caption] }) {
  return (
    <div className="tk-ev">
      <Media label="Photo" size="sm" />
      <span className="t-footnote bold">{file}</span>
      <span className="t-footnote muted">{caption}</span>
    </div>
  );
}

/** History line; the avatar shows the person the line starts with. */
function Log({ entry: [text, when] }) {
  const who = text.split(/[ :]/)[0];
  return (
    <div className="tk-log">
      <Avatar name={D.person(who) ? who : ''} size="sm" />
      <span className="t-footnote grow">{text}</span>
      <span className="t-footnote muted">{when}</span>
    </div>
  );
}

function Person({ name }) {
  return <span className="row-flex"><Avatar name={name} size="sm" />{D.person(name).full}</span>;
}

/** Facts list for a task. review = "Needs review" value; left out for tasks without D.taskDetail, where it isn't known. */
export function baseFacts(no, review, extra = []) {
  const t = D.task(no);
  return [
    ['Assignee', <span className="stack xs">{assignees(t).map(n => <Person key={n} name={n} />)}</span>],
    ['Due date', <span className="row-flex">{t.due}<span className="muted">{dueNote(t)}</span></span>],
    ['Priority', t.priority],
    ['Type', t.type],
    ...(review ? [['Needs review', review]] : []),
    ...extra,
    ['Tag', t.tags.length ? <span className="row-flex wrap">{t.tags.map(x => <Pill key={x} tone="outline">{x}</Pill>)}</span> : '—'],
    ['Created by', info(no).by],
  ];
}

/** A Member changes (moves, edits, cancels) only tasks assigned to them; Managers and Admins change any task. */
export function useMayChange(t) {
  return !useApp().is('member') || assigned(t, D.me().name);
}

/** Move to Archive: Managers and Admins for any task, a Member only for tasks they created. */
export function useMayArchive(t) {
  return !useApp().is('member') || info(t.no).by.split(' ')[0] === D.me().name;
}

/** In place of the actions on a canceled task: why it was canceled, and Restore for whoever may change it. */
function Canceled({ no, mine }) {
  const act = useStatusAction(no);
  const c = info(no).canceled;
  const restore = () => act('To do', 'Task restored', 'restored this task', { canceled: undefined });
  return (
    <Section className="tk-soft">
      <div className="stack sm">
        <span className="t-footnote">{c ? `Canceled by ${c.by}: ${c.reason}` : 'This task was canceled.'}</span>
        {mine && <div><Btn sm onClick={restore}>Restore</Btn></div>}
      </div>
    </Section>
  );
}

/** Who a Member asks instead, in place of the actions on someone else's task. */
function NotYours({ t }) {
  return (
    <Section className="tk-soft">
      <p className="t-footnote">Only {assignees(t).join(', ')}, the project Manager or an Admin can change this task.</p>
    </Section>
  );
}

/**
 * Status change for task no from its detail or a sheet: (status, toast, log, extras) moves it, logs it as the signed-in
 * person ("Nico started working") and shows it on the detail screen for its new status, in place of the current one.
 */
export function useStatusAction(no) {
  const { go, toast } = useApp();
  return (status, msg, log, extras) => {
    moveTask(no, status, { log: `${D.me().name} ${log}`, extras });
    toast(msg);
    go(detailOf(D.task(no)), { top: true, params: { task: no } });
  };
}

/**
 * Detail page for task no. The ⋯ menu has Edit task, Cancel task and Move to Archive. A Member edits, cancels and moves
 * only their own tasks (in any status), so someone else's task has a note in place of the actions, and archives only tasks
 * they created. A canceled task keeps only Move to Archive and shows Restore instead of the actions; an archived one has
 * neither. Move to Archive needs no dialog: the task lands in Archive and the next screen offers Undo.
 * banner, actions, facts, after and children fill the slots. Re-renders when the task is edited or moved.
 */
export function TaskDetail({ no, banner, actions, facts, after, children }) {
  useTaskMoves();
  const { go } = useApp();
  const t = D.task(no), x = info(no);
  const mine = useMayChange(t), mayArchive = useMayArchive(t);
  const archived = D.archivedTasks.includes(t), canceled = t.status === 'Canceled';
  const toArchive = () => {
    archiveTask(no, D.me().name);
    go('archive.undo', { top: true, params: { task: no } });
  };
  const items = [
    ...(mine && !canceled ? [{ label: 'Edit task', go: 'tasks.edit', task: no }, { label: 'Cancel task', sheet: 'tasks.cancel', task: no }] : []),
    ...(mayArchive ? [{ label: 'Move to Archive', onClick: toArchive, danger: true }] : []),
  ];
  const right = items.length && !archived ? <Menu items={items} label="Task actions" /> : undefined;
  const foot = <Foot><input className="tk-comment" placeholder="Write a comment… (@name to mention)" aria-label="Comment" /></Foot>;
  return (
    <FootScreen title="Task detail" right={right} foot={foot}>
      {banner}
      <div className="stack sm">
        <div className="stack xs">
          <h2 className="t-title2">{t.title}</h2>
          <span className="t-footnote muted">#{no} · {t.project} · {t.type}{x.phase ? ` · ${x.phase}` : ''}</span>
        </div>
        <span className="t-footnote bold">{dueLabel(t)}</span>
        <div><StatusPill status={t.status} /></div>
      </div>
      {archived ? <p className="t-footnote muted">This task is in Archive.</p>
        : canceled ? <Canceled no={no} mine={mine} /> : mine ? actions : <NotYours t={t} />}
      <dl className="tk-kv">
        {facts.map(([k, v]) => [<dt key={`${k}-k`}>{k}</dt>, <dd key={`${k}-v`}>{v}</dd>])}
      </dl>
      {after}
      <Sec title="Description">
        <p className={`t-subhead${x.desc ? '' : ' muted'}`}>{x.desc || 'No description yet.'}</p>
      </Sec>
      {children}
      <Sec title="Chat & history">{x.history.map(e => <Log key={e.join()} entry={e} />)}</Sec>
    </FootScreen>
  );
}
