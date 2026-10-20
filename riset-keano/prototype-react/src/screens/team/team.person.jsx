// Team ② Person, for the person in the screen params (else Rina): profile facts, the projects the viewer shares with
// them and (for PM/Admin, or a Member looking at themself) their active tasks from the live task list.
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Head, Pill, Row, Rows, Screen, Section } from '../../kit';
import { taskScreen } from '../events/events.shared';
import { useTaskMoves } from '../tasks/tasks.store';
import { activeOf, isOverdue, loadOf } from './team.load';

const PILL_TONE = { Overdue: 'danger', 'In progress': 'accent', 'In review': 'warning', 'To do': 'neutral' };

/** Task row → the detail screen for its status; an overdue task shows Overdue instead of its status. */
function TaskRow({ t }) {
  const pill = isOverdue(t) ? 'Overdue' : t.status;
  return (
    <Row title={`#${t.no} ${t.title}`} sub={`${t.project} · ${t.when}`} right={<Pill tone={PILL_TONE[pill]}>{pill}</Pill>}
      go={taskScreen(t)} task={t.no} />
  );
}

/** Active tasks of p; a Member sees only their own. hidden = projects of p the viewer isn't on (named, not detailed). */
function Tasks({ p, hidden }) {
  const { is } = useApp();
  if (is('member') && D.me().key !== p.key) {
    return <Section><p className="t-subhead">Other people's task lists are visible only to the project Manager and Admin.</p></Section>;
  }
  const load = loadOf(p.name);
  return (
    <section className="stack sm">
      <Head title="Active tasks" right={<span className="t-footnote muted">{load.active} active · {load.overdue} overdue</span>} />
      {load.active ? <Rows>{activeOf(p.name).map(t => <TaskRow key={t.no} t={t} />)}</Rows>
        : <p className="t-subhead muted">No active tasks.</p>}
      {hidden.length > 0 && (
        <p className="t-footnote muted">{p.name} also works on {hidden.join(', ')}. Details are visible only to that project's Manager and Admin.</p>
      )}
    </section>
  );
}

function TeamPerson() {
  const { is, params } = useApp();
  useTaskMoves();
  const key = D.people[params.person] ? params.person : 'rina';
  const p = { key, ...D.people[key] };
  const status = D.team.list.find(o => o.key === key)?.status || 'Available';
  const me = D.me().name;
  const theirs = D.projects.filter(pr => pr.members.includes(p.name));
  const shared = theirs.filter(pr => is('admin') || pr.members.includes(me));
  const hidden = theirs.filter(pr => !shared.includes(pr)).map(pr => pr.name);
  return (
    <Screen title="Team member" back tab="more">
      <div className="row-flex">
        <Avatar name={p.name} size="xl" />
        <div className="stack xs grow">
          <h1 className="t-title2">{p.full}</h1>
          <span className={`t-footnote tm-status${status === 'Available' ? ' on' : ''}`}>{status}</span>
        </div>
      </div>
      <Section>
        <dl className="tm-kv">
          <dt>Job title</dt><dd>{p.title}</dd>
          <dt>Division</dt><dd>{p.division}</dd>
          <dt>Email</dt><dd>{p.email}</dd>
          <dt>Account role</dt><dd>{p.role}</dd>
        </dl>
      </Section>
      <section className="stack sm">
        <Head title={is('admin') ? 'Projects' : 'Shared projects'} />
        {shared.length ? <Rows>{shared.map(pr => <Row key={pr.id} title={pr.name} go="projects.overview" params={{ project: pr.id }} />)}</Rows>
          : <p className="t-subhead muted">No shared projects.</p>}
      </section>
      <Tasks p={p} hidden={hidden} />
    </Screen>
  );
}

export default TeamPerson;
