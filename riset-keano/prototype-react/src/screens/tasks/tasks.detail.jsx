// Tasks ⑧–⑩ shared detail layout: header block, key/value facts, sections, history, and a pinned comment bar.
import { Avatar, Btn, Media, Pill } from '../../kit';
import { D } from '../../data/sample';
import { Foot, FootScreen, Sec, Tick } from './tasks.parts';
import { days, info } from './tasks.shared';

const dueLabel = t => {
  const d = days(t.due);
  return t.status === 'Done' ? t.when : d < 0 ? `Overdue ${-d} days` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `Due ${t.due}`;
};
const dueNote = t => {
  const d = days(t.due);
  return t.status === 'Done' ? '' : d < 0 ? `(${-d} days late)` : d === 0 ? '(today)' : d === 1 ? '(tomorrow)' : '';
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
    ['Assignee', <Person name={t.who} />],
    ['Due date', <span className="row-flex">{t.due}<span className="muted">{dueNote(t)}</span></span>],
    ['Priority', t.priority],
    ['Type', t.type],
    ...(review ? [['Needs review', review]] : []),
    ...extra,
    ['Tag', t.tags.length ? <span className="row-flex wrap">{t.tags.map(x => <Pill key={x} tone="outline">{x}</Pill>)}</span> : '—'],
    ['Created by', info(no).by],
  ];
}

/** Detail page for task no. menu = false hides ⋯ (Cancel sheet); banner, actions, facts, after and children fill the slots. */
export function TaskDetail({ no, menu = true, banner, actions, facts, after, children }) {
  const t = D.task(no), x = info(no);
  const right = menu ? <Btn kind="ghost" sm sheet="tasks.cancel" task={no} aria-label="More">⋯</Btn> : null;
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
        <div><Pill>{t.status}</Pill></div>
      </div>
      {actions}
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
