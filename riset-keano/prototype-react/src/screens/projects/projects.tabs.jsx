// Projects ⑨–⑪: detail tabs Tasks, Phases and Members (header and tabs come from DetailScreen).
import { List, SquareKanban } from 'lucide-react';
import { Avatar, Btn, Link, Pill, Progress, Section, Seg, Select, StatusPill } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Board } from '../tasks/tasks.board';
import { TasksSearch } from '../tasks/tasks.filter';
import { NoMatch } from '../tasks/tasks.list';
import { applyQuery, queryOf, queryParams } from '../tasks/tasks.query';
import { useTaskMoves } from '../tasks/tasks.store';
import { DetailScreen, atlas, atlasTasks, useCanEdit, useNote } from './projects.detail';

const DETAIL = { 'To do': 'tasks.detail-todo', 'In progress': 'tasks.detail-progress', 'In review': 'tasks.detail-review', Done: 'tasks.detail-progress' };
// Action per task (Manager/Admin view), outline so "+ New task" stays the one lime button. A Member only gets View.
const ACTIONS = {
  12: { label: 'Request review', toast: 'Sent for review' },
  17: { label: 'Review', go: 'tasks.detail-review', task: 17 },
  14: { label: 'Start working', toast: 'Task started' },
  15: { label: 'Start working', toast: 'Task started' },
};

function TaskCard({ t, canEdit, note }) {
  const { label, ...a } = (canEdit && ACTIONS[t.no]) || { label: 'View', go: DETAIL[t.status], task: t.no };
  return (
    <Section go={DETAIL[t.status]} task={t.no}>
      <div className="stack sm">
        <div className="row-flex"><span className="t-subhead muted">#{t.no}</span><span className="t-headline">{t.title}</span></div>
        <div><StatusPill status={t.status} /></div>
        <span className="t-subhead">{t.type} · {t.priority} · {t.who} · {t.due}</span>
        <div className="between pj-end"><span className="t-subhead bold">{note(t)}</span><Btn sm {...a}>{label}</Btn></div>
      </div>
    </Section>
  );
}

/** ⑨ Detail · Tasks. params.board = Kanban view; List / Kanban swaps the view in place, so the project header and
 *  tabs stay (the global ③ Kanban would leave the project). Search and Filter & sort are the Tasks menu's (status,
 *  assignee, priority, sort in the screen params); List / Kanban keeps that query, as it does there. Search, view and
 *  New task stick under the nav bar (pj-tools), so a long list never needs scrolling back up to reach them. */
export function ProjectsTasks({ params }) {
  const { go } = useApp(), board = !!params?.board;
  useTaskMoves();
  const canEdit = useCanEdit(), note = useNote(), list = applyQuery(atlasTasks(), queryOf(params, false, true), board);
  const view = i => go('projects.tasks', { params: { ...queryParams(params), ...(i ? { board: true } : {}) } });
  return (
    <DetailScreen on={1}>
      <div className="pj-tools">
        <TasksSearch inProject />
        <div className="between">
          <div className="pj-seg"><Seg items={['List', 'Kanban']} icons={[<List size={18} aria-hidden="true" />, <SquareKanban size={18} aria-hidden="true" />]} on={board ? 1 : 0}
            onPick={view} /></div>
          <Btn kind="primary" sm go="tasks.form">+ New task</Btn>
        </div>
      </div>
      {board ? <Board tasks={list} /> : list.length ? <>
        {list.map(t => <TaskCard key={t.no} t={t} canEdit={canEdit} note={note} />)}
        <span className="t-subhead muted">{list.length} {list.length === 1 ? 'task' : 'tasks'}</span>
      </> : <NoMatch />}
    </DetailScreen>
  );
}

const PHASE_BTN = {
  'In progress': { label: 'Complete phase', kind: 'primary', toast: 'Phase completed' },
  Testing: { label: 'Start phase', kind: 'outline', toast: 'Phase started' },
};

/** Phase card; canEdit adds + Milestone and Complete / Start phase (Manager & Admin). */
function PhaseCard({ ph, i, canEdit }) {
  const done = ph.state === 'Done', now = ph.state === 'In progress';
  const p = done ? 100 : now ? D.atlas.phasePct : 0;
  const btn = canEdit && (PHASE_BTN[ph.state] || PHASE_BTN[ph.name]);
  return (
    <Section className={now ? 'pj-strong' : ''}>
      <div className="stack">
        <div className="row-flex pj-top">
          <span className={`pj-num${done ? ' done' : ''}`}>{done ? '✓' : i + 1}</span>
          <span className="stack xs grow"><span className="t-headline">{ph.name}</span><span className="t-subhead muted">{ph.range}</span></span>
          <StatusPill status={ph.state} />
        </div>
        {p ? (
          <div className="row-flex"><div className="grow"><Progress value={p} /></div><span className="t-subhead bold">{p}%</span></div>
        ) : <span className="t-subhead muted">No progress yet</span>}
        <div className="stack sm">
          <span className="t-subhead bold">Milestone</span>
          {ph.milestone && <><span className="t-subhead">◆ {ph.milestone}</span><span className="t-subhead muted pj-indent">{ph.mState}</span></>}
          {canEdit && <div><Link toast="Add milestone">+ Milestone</Link></div>}
        </div>
        {btn && <Btn kind={btn.kind} block sm toast={btn.toast}>{btn.label}</Btn>}
      </div>
    </Section>
  );
}

/** ⑩ Detail · Phases. */
export function ProjectsPhases() {
  const A = D.atlas, H = A.deadlineHistory, canEdit = useCanEdit();
  return (
    <DetailScreen on={2}>
      <div className="between"><span className="t-subhead muted">{A.phases.length} phases</span>{canEdit && <Btn sm toast="Add phase">+ Phase</Btn>}</div>
      {A.phases.map((ph, i) => <PhaseCard key={ph.name} ph={ph} i={i} canEdit={canEdit} />)}
      <Section title="Deadline history" className="pj-soft">
        <div className="stack sm">
          <span className="t-subhead muted">Original deadline: {H.original}</span>
          <div className="between"><span className="bold">{H.change}</span><Pill tone="outline">{H.reason}</Pill></div>
          <span className="t-subhead">{H.note} · {H.by}</span>
        </div>
      </Section>
    </DetailScreen>
  );
}

// Project roles are not in D: Nico is Manager + Lead, Sri joined as Observer (= Viewer), the rest are Members.
const ROLE = { Nico: 'Manager', Sri: 'Viewer' };

function MemberCard({ name, canEdit }) {
  const p = D.person(name), role = ROLE[name] || 'Member', lead = name === atlas().lead;
  return (
    <Section>
      <div className="stack sm">
        <div className="row-flex">
          <Avatar name={p.full} />
          <span className="stack xs grow">
            <span className="row-flex wrap"><span className="bold">{p.full}</span>
              {p.name === D.me().name && <span className="t-subhead">(You)</span>}{lead && <Pill tone="outline">Lead</Pill>}</span>
            <span className="t-subhead muted">{p.title} · {p.division}</span>
          </span>
        </div>
        {canEdit ? (
          <div className="between">
            <Select toast="Manager · Member · Viewer">{role}</Select>
            {lead ? <span className="t-subhead bold muted">Remove</span> : <Link toast="Member removed">Remove</Link>}
          </div>
        ) : <span className="t-subhead bold">{role}</span>}
      </div>
    </Section>
  );
}

/** ⑪ Detail · Members. */
export function ProjectsMembers() {
  const P = atlas(), canEdit = useCanEdit();
  return (
    <DetailScreen on={3}>
      <div className="between">
        <span className="t-subhead muted">{P.members.length} members</span>
        {canEdit && <Btn sm toast="Pick a member">+ Member</Btn>}
      </div>
      {P.members.map(n => <MemberCard key={n} name={n} canEdit={canEdit} />)}
      {canEdit && (
        <Section className="pj-soft">
          <p className="t-subhead">{P.lead} is the only Manager, so they can't be removed. Add a second Manager so their tasks can be reviewed by someone else.</p>
        </Section>
      )}
      <div className="stack sm">
        <h2 className="t-headline">What roles mean</h2>
        <div className="pj-roles t-subhead">
          <span className="bold">Manager</span><span>edit the project, phases, members, deadline, and review tasks</span>
          <span className="bold">Member</span><span>create and work on tasks</span>
          <span className="bold">Viewer</span><span>view and comment</span>
        </div>
      </div>
    </DetailScreen>
  );
}
