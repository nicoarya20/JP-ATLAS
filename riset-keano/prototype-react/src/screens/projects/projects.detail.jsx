// Projects ⑧: project detail frame (header + tabs) and the Overview tab. Every project card opens Atlas (the only project with full data).
import { CalendarClock, CircleAlert, Clock } from 'lucide-react';
import { Btn, Link, Progress, Row, Rows, Screen, Section, StatusPill, Tabs } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';

const TAB_IDS = ['projects.overview', 'projects.tasks', 'projects.phases', 'projects.members'];
export const atlas = () => D.project('atlas');
export const atlasTasks = () => D.tasks.filter(t => t.project === atlas().name);

/** Deadline and members are changed by the project's Manager or an Admin, so Members see them read-only. */
export function useCanEdit() {
  return !useApp().is('member');
}

/** Task notes are written from the reviewer's (Nico's) side in D; everyone else sees who the review waits on. */
export function useNote() {
  const { is } = useApp();
  const reviewer = D.taskDetail[17].reviewer.split(' ')[0];
  return t => (t.status === 'In review' && !is('pm') ? `Awaiting review by ${reviewer}` : t.when);
}

/** Shared detail header (status, attention reason, lead/deadline, extend button) + tabs; on = active tab index. */
export function DetailScreen({ on, children }) {
  const P = atlas(), canEdit = useCanEdit();
  // ⋯ is not drawn on the ⑧–⑪ app bar in Penpot; "⋯ › Project settings" comes from Tasks ⑬, so ⋯ links straight there.
  // Members can't change project settings, so they get no ⋯ at all.
  const more = canEdit && <Btn kind="ghost" sm go="tasks.settings" aria-label="Project settings">⋯</Btn>;
  return (
    <Screen title={P.name} back right={more || undefined} tab="projects">
      <div className="stack sm">
        <div className="row-flex"><StatusPill status={P.status} /><StatusPill status={P.health} /></div>
        <span className="t-subhead">Why: {P.why}</span>
        <span className="t-subhead bold mt-1">Lead: {P.lead} · Due: {P.dueLong}</span>
        <div className="between">
          <StatusPill status={P.extended} />
          {canEdit && <Btn sm sheet="projects.extend">Extend deadline</Btn>}
        </div>
      </div>
      <Tabs items={['Overview', 'Tasks', 'Phases', 'Members']} on={on} gos={TAB_IDS} />
      {children}
    </Screen>
  );
}

function Pct({ label, value }) {
  return (
    <div className="stack xs">
      <div className="between"><span className="t-subhead">{label}</span><span className="t-subhead bold">{value}%</span></div>
      <Progress value={value} />
    </div>
  );
}

const STEP = { Done: 'done', 'In progress': 'now' };

function Steps({ phases }) {
  return (
    <div className="pj-steps">
      {phases.map(ph => (
        <div key={ph.name} className={STEP[ph.state] || ''}>
          <i aria-hidden="true">{ph.state === 'Done' ? '✓' : ''}</i>
          <span className="t-footnote">{ph.name}</span>
        </div>
      ))}
    </div>
  );
}

const ATTENTION = [
  ['Overdue', 12, 'tasks.detail-progress', CircleAlert],
  ['Awaiting review', 17, 'tasks.detail-review', Clock],
  ['Due today', 14, 'tasks.detail-todo', CalendarClock],
];

/** ⑧ Detail · Overview. */
export function ProjectsOverview() {
  const P = atlas(), A = D.atlas, note = useNote();
  return (
    <DetailScreen on={0}>
      <Section title="Progress">
        <div className="stack">
          <Pct label="Tasks done" value={P.progress} />
          <Pct label="Time elapsed" value={A.timeElapsed} />
          <span className="t-subhead muted">Start {A.started} · due {P.due} · {A.daysLeft} days left</span>
        </div>
      </Section>
      <Section title="Phases & next milestone">
        <div className="stack">
          <Steps phases={A.phases} />
          <span className="t-subhead bold">Now: {A.phaseNow} · {A.phasePct}%</span>
          <div className="stack sm">
            <span className="t-subhead">◆ Next milestone: {A.nextMilestone.name}</span>
            <span className="t-subhead muted pj-indent">{A.nextMilestone.date} · in {A.nextMilestone.inDays} days</span>
          </div>
          <div><Link go="projects.phases">See all phases →</Link></div>
        </div>
      </Section>
      <h2 className="t-headline">Tasks needing attention</h2>
      <Rows>
        {ATTENTION.map(([reason, no, go, Icon]) => {
          const t = D.task(no);
          return <Row key={no} lead={<Icon size={18} className="tint" role="img" aria-label={reason} />}
            title={`#${t.no} ${t.title}`} sub={`${t.who} · ${note(t)}`} go={go} task={no} />;
        })}
      </Rows>
      <h2 className="t-headline">Recent activity</h2>
      <Rows>
        {A.activity.map(([text, date]) => <Row key={text} title={text} right={<span className="t-footnote muted">{date}</span>} />)}
      </Rows>
    </DetailScreen>
  );
}
