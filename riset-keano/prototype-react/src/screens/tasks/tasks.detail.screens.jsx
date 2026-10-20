// Tasks ⑧–⑩: detail per status. Each screen shows the tapped task (params.task), else its sample: #14, #12, #17.
import { Btn, Link, Section } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Sec } from './tasks.parts';
import { Evidence, Step, TaskDetail, baseFacts, stepsTitle } from './tasks.detail';
import { info, pick, reviewer } from './tasks.shared';

/** ⑧ To do — review off, so Mark done finishes directly; with review turned on (Edit task) only Start working. */
export function TasksDetailTodo({ params }) {
  const member = useApp().is('member');
  const no = pick(params, 'tasks.detail-todo', 14), x = info(no);
  const actions = (
    <div className="row-flex">
      <Btn kind="primary" go="tasks.detail-progress" toast="Task started">Start working</Btn>
      {!x.reviewer && <Btn toast="Marked as done">Mark done</Btn>}
    </div>
  );
  const off = member ? 'Off · you may turn it on' : 'Off · Mark done directly';
  const review = D.taskDetail[no] && (x.reviewer ? 'Yes · Request review before Done' : off);
  return (
    <TaskDetail no={no} actions={actions} facts={baseFacts(no, review, x.reviewer ? [['Reviewer', x.reviewer]] : [])}>
      <Sec title={stepsTitle(x.steps)}>
        {x.steps.length ? x.steps.map(s => <Step key={s[0]} step={s} />) : <p className="t-footnote muted">No steps yet.</p>}
        <div><Link toast="Step added">+ Add step</Link></div>
      </Sec>
    </TaskDetail>
  );
}

/**
 * ⑨ In progress — review on, so only Request review; lead = assignee, so the reviewer falls back to Admin.
 * Done tasks open here too, with their status shown and Reopen instead of Request review.
 */
export function TasksDetailProgress({ params }) {
  const no = pick(params, 'tasks.detail-progress', 12), x = info(no);
  const actions = D.task(no).status === 'Done'
    ? <Btn block toast="Task reopened">Reopen</Btn>
    : <Btn kind="primary" block go="tasks.detail-review" toast="Review requested">Request review</Btn>;
  const facts = baseFacts(no, x.reviewer && `Yes · turned on by ${x.by.split(' ')[0]}`, x.reviewer ? [['Reviewer', x.reviewer]] : []);
  const after = x.reviewer === 'Admin' && (
    <Section className="tk-soft"><p className="t-footnote">The lead is the assignee. Add a second manager so this project has a reviewer.</p></Section>
  );
  return (
    <TaskDetail no={no} actions={actions} facts={facts} after={after}>
      {x.steps.length > 0 && <Sec title={stepsTitle(x.steps)}>{x.steps.map(s => <Step key={s[0]} step={s} />)}</Sec>}
      {x.proof.length > 0 && (
        <Sec title={`Evidence ${x.proof.length}`}>
          {x.proof.map(p => <Evidence key={p[0]} proof={p} />)}
          <div><Link toast="Evidence attached">+ Attach evidence</Link></div>
        </Sec>
      )}
    </TaskDetail>
  );
}

/** Banner naming who asked whom to review ("Dodi asked you…"), from taskDetail.asked. */
function Asked({ asked }) {
  const [, asker, when] = asked.match(/^(\S+) .* · (.+)$/), me = D.me().name;
  const text = asker === me ? `You asked ${reviewer()}` : `${asker} asked ${reviewer() === me ? 'you' : reviewer()}`;
  return (
    <Section className="tk-soft">
      <div className="stack xs">
        <span className="t-headline">{text} to review this task</span>
        <span className="t-footnote">Requested {when}</span>
      </div>
    </Section>
  );
}

/** ⑩ In review — Approve/Return for Manager & Admin only; Needs review is locked. A Member sees who it waits on. */
export function TasksDetailReview({ params }) {
  const member = useApp().is('member');
  const no = pick(params, 'tasks.detail-review', 17), t = D.task(no), x = info(no);
  const actions = member ? (
    <Section className="tk-soft">
      <p className="t-footnote">Waiting for a Manager or Admin. You'll be notified when it's approved or returned.</p>
    </Section>
  ) : (
    <div className="stack sm">
      <div className="row-flex">
        <Btn kind="primary" go="tasks.all" toast="Task done">Approve</Btn>
        <Btn sheet="tasks.return" task={no}>Return</Btn>
      </div>
      <p className="t-footnote muted">Approve → automatically Done</p>
    </div>
  );
  const proofTitle = `${t.who === D.me().name ? 'Your evidence' : `Evidence from ${t.who}`} ${x.proof.length}`;
  return (
    <TaskDetail no={no} banner={x.asked && <Asked asked={x.asked} />} actions={actions}
      facts={baseFacts(no, 'Yes · locked while in review', x.reviewer ? [['Reviewer', x.reviewer]] : [])}>
      {x.proof.length > 0 && <Sec title={proofTitle}><div className="tk-two">{x.proof.map(p => <Evidence key={p[0]} proof={p} />)}</div></Sec>}
      {x.steps.length > 0 && (
        <Sec title={`${stepsTitle(x.steps)}${x.steps.every(s => s[1]) ? ' ✓' : ''}`}>{x.steps.map(s => <Step key={s[0]} step={s} />)}</Sec>
      )}
    </TaskDetail>
  );
}
