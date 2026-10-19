// Projects ⑨–⑪: detail tabs Tasks, Phases and Members (header and tabs come from DetailScreen).
import { Kanban, List } from 'lucide-react';
import { Avatar, Btn, Chips, Link, Pill, Progress, Section, Seg, Select } from '../../kit';
import { D } from '../../data/sample';
import { DetailScreen, atlas, atlasTasks, useCanEdit, useNote } from './projects.detail';

const DETAIL = { 'To do': 'tasks.detail-todo', 'In progress': 'tasks.detail-progress', 'In review': 'tasks.detail-review', Done: 'tasks.detail-progress' };
// Main action per task (Manager/Admin view). A Member only gets View, since none of these actions are theirs to take.
const ACTIONS = {
  12: { label: 'Request review', kind: 'primary', toast: 'Sent for review' },
  17: { label: 'Review', kind: 'primary', go: 'tasks.detail-review', task: 17 },
  14: { label: 'Start working', kind: 'primary', toast: 'Task started' },
  15: { label: 'Start working', kind: 'outline', toast: 'Task started' },
};

function TaskCard({ t, canEdit, note }) {
  const { label, ...a } = (canEdit && ACTIONS[t.no]) || { label: 'View', kind: 'outline', go: DETAIL[t.status], task: t.no };
  return (
    <Section go={DETAIL[t.status]} task={t.no}>
      <div className="stack sm">
        <div className="row-flex"><span className="t-subhead muted">#{t.no}</span><span className="t-headline">{t.title}</span></div>
        <div><Pill tone={t.status === 'Done' ? 'neutral' : 'outline'}>{t.status}</Pill></div>
        <span className="t-subhead">{t.type} · {t.priority} · {t.who} · {t.due}</span>
        <div className="between pj-end"><span className="t-subhead bold">{note(t)}</span><Btn sm {...a}>{label}</Btn></div>
      </div>
    </Section>
  );
}

/** ⑨ Detail · Tasks. */
export function ProjectsTasks() {
  const canEdit = useCanEdit(), note = useNote(), list = atlasTasks();
  return (
    <DetailScreen on={1}>
      <Chips items={['All', 'My tasks', 'Overdue', 'Awaiting review']} />
      <div className="between">
        <div className="pj-seg"><Seg items={['List', 'Kanban']} icons={[<List size={18} aria-hidden="true" />, <Kanban size={18} aria-hidden="true" />]} on={0} gos={['', 'tasks.board']} /></div>
        <Btn kind="primary" sm go="tasks.form">+ New task</Btn>
      </div>
      {list.map(t => <TaskCard key={t.no} t={t} canEdit={canEdit} note={note} />)}
      <span className="t-subhead muted">{list.length} tasks</span>
    </DetailScreen>
  );
}

const PHASE_BTN = {
  'In progress': { label: 'Complete phase', kind: 'primary', toast: 'Phase completed' },
  Testing: { label: 'Start phase', kind: 'outline', toast: 'Phase started' },
};

function PhaseCard({ ph, i }) {
  const done = ph.state === 'Done', now = ph.state === 'In progress';
  const p = done ? 100 : now ? D.atlas.phasePct : 0;
  const btn = PHASE_BTN[ph.state] || PHASE_BTN[ph.name];
  return (
    <Section className={now ? 'pj-strong' : ''}>
      <div className="stack">
        <div className="row-flex pj-top">
          <span className={`pj-num${done ? ' done' : ''}`}>{done ? '✓' : i + 1}</span>
          <span className="stack xs grow"><span className="t-headline">{ph.name}</span><span className="t-subhead muted">{ph.range}</span></span>
          <Pill tone={now ? 'neutral' : 'outline'}>{ph.state}</Pill>
        </div>
        {p ? (
          <div className="row-flex"><div className="grow"><Progress value={p} /></div><span className="t-subhead bold">{p}%</span></div>
        ) : <span className="t-subhead muted">No progress yet</span>}
        <div className="stack sm">
          <span className="t-subhead bold">Milestone</span>
          {ph.milestone && <><span className="t-subhead">◆ {ph.milestone}</span><span className="t-subhead muted pj-indent">{ph.mState}</span></>}
          <div><Link toast="Add milestone">+ Milestone</Link></div>
        </div>
        {btn && <Btn kind={btn.kind} block sm toast={btn.toast}>{btn.label}</Btn>}
      </div>
    </Section>
  );
}

/** ⑩ Detail · Phases. */
export function ProjectsPhases() {
  const A = D.atlas, H = A.deadlineHistory;
  return (
    <DetailScreen on={2}>
      <div className="between"><span className="t-subhead muted">{A.phases.length} phases</span><Btn sm toast="Add phase">+ Phase</Btn></div>
      {A.phases.map((ph, i) => <PhaseCard key={ph.name} ph={ph} i={i} />)}
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
