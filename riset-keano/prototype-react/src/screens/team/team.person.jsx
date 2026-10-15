// Team ② Person: profile facts, shared projects and (for PM/Admin) the person's active tasks.
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Head, Pill, Row, Rows, Screen, Section } from '../../kit';

const R = D.person('rina');
const PILL_TONE = { Overdue: 'danger', 'In progress': 'accent', 'To do': 'neutral' };

/** Task row -> the detail screen for its status. Only numbers in D.tasks pass `task`; #11/#18 fall back to the sample task. */
function TaskRow({ t: [title, meta, pill] }) {
  const no = Number(title.match(/\d+/)[0]);
  return (
    <Row title={title} sub={meta} right={<Pill tone={PILL_TONE[pill]}>{pill}</Pill>}
      go={`tasks.detail-${pill === 'To do' ? 'todo' : 'progress'}`} task={D.task(no) ? no : undefined} />
  );
}

function Tasks() {
  const { is } = useApp();
  if (is('member')) {
    return <Section><p className="t-subhead">Other people's task lists are visible only to the project Manager and Admin.</p></Section>;
  }
  return (
    <section className="stack sm">
      <Head title="Active tasks" right={<span className="t-footnote muted">3 active · 1 overdue</span>} />
      <Rows>{D.team.rinaTasks.map(t => <TaskRow key={t[0]} t={t} />)}</Rows>
      <p className="t-footnote muted">
        {is('admin') ? '2 more tasks are in the Tasks menu.'
          : `${R.name} also works on PT Sinar Client Portal. Details are visible only to that project's Manager and Admin.`}
      </p>
    </section>
  );
}

function TeamPerson() {
  return (
    <Screen title="Team member" back tab="more">
      <div className="row-flex">
        <Avatar name={R.name} size="xl" />
        <div className="stack xs grow">
          <h1 className="t-title2">{R.full}</h1>
          <span className="t-footnote tm-status on">Available</span>
        </div>
      </div>
      <Section>
        <dl className="tm-kv">
          <dt>Job title</dt><dd>{R.title}</dd>
          <dt>Division</dt><dd>{R.division}</dd>
          <dt>Email</dt><dd>{R.email}</dd>
          <dt>Account role</dt><dd>{R.role}</dd>
        </dl>
      </Section>
      <section className="stack sm">
        <Head title="Shared projects" />
        <Rows>
          <Row title="Atlas Project" go="projects.overview" />
          <Row title="PT Sinar Client Portal" go="projects.overview" />
        </Rows>
      </section>
      <Tasks />
    </Screen>
  );
}

export default TeamPerson;
