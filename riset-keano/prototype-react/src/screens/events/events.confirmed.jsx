// Events ⑨ detail with confirmed results, for the event in the screen params: the Atlas kickoff reads D.kickoff, an event
// confirmed in Step 3 reads its created tasks (e.outcomes) and the stand-up minutes it was confirmed from (D.standup).
// Tasks go to the project, decisions to its history, open questions to the next meeting's agenda. No ⋯ menu.
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Pill, Screen, Section } from '../../kit';
import { useTaskMoves } from '../tasks/tasks.store';
import { Box, Bullets, EvHead, EvSec, Note } from './events.parts';
import { EV, eventOf, taskScreen } from './events.shared';
import { useEvents } from './events.store';

/** Minutes body of the kickoff; D only has its source line. */
const KICKOFF_MINUTES = 'Kickoff for Atlas Project. Login will use the office SSO instead of separate accounts. Before release we trial the app with 5 older users. The server budget is approved through December.';

/** Confirmed results of event e: { tasks: [{no, title, status}], decisions, info, question, confirmed, source, minutes }. */
function resultsOf(e) {
  if (e.id === 'kickoff') {
    const k = D.kickoff;
    const [source, ...by] = k.source.split(' · ');
    return {
      ...k,
      tasks: k.tasks.map(([label, status]) => {
        const [, no, title] = label.match(/^#(\d+) (.+)$/);
        return { no: Number(no), title, status };
      }),
      source: [source, by.join(' · ')],
      minutes: KICKOFF_MINUTES,
    };
  }
  const s = D.standup;
  const { tasks, by, date } = e.outcomes;
  return {
    ...s,
    tasks: tasks.map(no => ({ no, title: D.task(no)?.title, status: 'To do' })),
    confirmed: `Confirmed by ${by} · ${date}`,
    source: ['Source: voice recording', s.by],
    minutes: s.transcript.join(' '),
  };
}

/** Task created from the outcomes; status, owner, due and detail screen from D.task when it still exists. */
function Made({ no, title, status }) {
  const t = D.task(no);
  const now = t ? t.status : status;
  return (
    <Section go={t ? taskScreen(t) : 'tasks.all'} task={t ? t.no : undefined} className="ev-card">
      <div className="between">
        <div className="stack xs">
          <p className="t-headline">{`#${no} ${title}`}</p>
          {t && <p className="t-footnote muted">{t.who} · {t.due ? `Due ${t.due}` : 'No due date'}</p>}
        </div>
        <Pill tone={now === 'Done' ? 'success' : 'neutral'}>{now}</Pill>
      </div>
    </Section>
  );
}

/** Events ⑨: results confirmed. An event without confirmed outcomes shows the kickoff. */
export default function DetailConfirmed() {
  const { params } = useApp();
  useEvents();
  useTaskMoves();
  const asked = eventOf(params, 'kickoff');
  const e = EV.confirmed(asked) ? asked : D.event('kickoff');
  const r = resultsOf(e);
  const done = r.tasks.filter(t => (D.task(t.no)?.status || t.status) === 'Done').length;
  const count = r.tasks.length === 1 ? '1 task' : `${r.tasks.length} tasks`;
  return (
    <Screen back title="Event detail">
      <EvHead title={e.title}>
        <Pill tone="success">Done</Pill>
        <Pill tone="outline">{e.type}</Pill>
        <Pill>{`Confirmed · ${count} (${done} done)`}</Pill>
      </EvHead>
      <div className="ev-info t-subhead">
        <span>{EV.date(e)} · {e.range}</span>
        <span>{EV.where(e)} · {EV.project(e)}</span>
        <span>Attendees: {e.attendees.join(', ')}</span>
      </div>
      <div className="stack xs">
        <h2 className="t-headline">Meeting results</h2>
        <Note>{r.confirmed}</Note>
      </div>
      <EvSec title={`Tasks created (${r.tasks.length})`}>
        {r.tasks.map(t => <Made key={t.no} {...t} />)}
        <Note>{r.tasks.length ? 'Tap a task to open its detail in Tasks.' : 'No tasks came out of this meeting.'}</Note>
      </EvSec>
      <EvSec title={`Decisions (${r.decisions.length})`}><Bullets items={r.decisions} /></EvSec>
      <EvSec title={`Information (${r.info.length})`}><Bullets items={r.info} /></EvSec>
      <EvSec title="Open questions (1)">
        <Box><p className="bold">{r.question.text}</p><p className="t-footnote muted">{r.question.meta}</p></Box>
      </EvSec>
      <div className="ev-sep" />
      <EvSec title="Minutes" tag={<Pill tone="success">Confirmed</Pill>}>
        <div className="ev-plain stack sm">
          <div className="stack xs">{r.source.map(line => <Note key={line}>{line}</Note>)}</div>
          <p className="t-subhead">{r.minutes}</p>
        </div>
        <Btn block go="events.step2" params={{ event: e.id }}>See full minutes</Btn>
      </EvSec>
    </Screen>
  );
}
