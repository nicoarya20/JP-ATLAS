// Events ⑨ detail with confirmed results: Atlas kickoff (D.kickoff). Tasks go to the project, decisions to its history,
// open questions to the next meeting's agenda. No ⋯ menu: the one-off sheets show the design review.
import { D } from '../../data/sample';
import { Btn, Pill, Screen, Section } from '../../kit';
import { Box, Bullets, EvHead, EvSec, Note } from './events.parts';
import { PROJECT, taskScreen } from './events.shared';

/** Minutes body of the kickoff; D only has its source line. */
const KICKOFF_MINUTES = 'Kickoff for Atlas Project. Login will use the office SSO instead of separate accounts. Before release we trial the app with 5 older users. The server budget is approved through December.';

/** Task created from the outcomes: [label "#8 Title", status] from D.kickoff; owner, due and detail screen from D.task. */
function Made({ label, status }) {
  const [, no, title] = label.match(/^#(\d+) (.+)$/);
  const t = D.task(Number(no));
  return (
    <Section go={t ? taskScreen(t) : 'tasks.all'} task={t ? t.no : undefined} className="ev-card">
      <div className="between">
        <div className="stack xs">
          <p className="t-headline">{`#${no} ${title}`}</p>
          {t && <p className="t-footnote muted">{t.who} · Due {t.due}</p>}
        </div>
        <Pill tone={status === 'Done' ? 'success' : 'neutral'}>{status}</Pill>
      </div>
    </Section>
  );
}

/** Events ⑨: results confirmed. */
export default function DetailConfirmed() {
  const k = D.kickoff;
  const [when, range, place] = k.when.split(' · ');
  const [source, ...by] = k.source.split(' · ');
  const done = k.tasks.filter(t => t[1] === 'Done').length;
  return (
    <Screen back title="Event detail">
      <EvHead title={k.title}>
        <Pill tone="success">Done</Pill>
        <Pill tone="outline">Meeting</Pill>
        <Pill>{`Confirmed · ${k.tasks.length} tasks (${done} done)`}</Pill>
      </EvHead>
      <div className="ev-info t-subhead">
        <span>{when} · {range}</span>
        <span>{place} · {PROJECT()}</span>
        <span>Attendees: {D.event('kickoff').attendees.join(', ')}</span>
      </div>
      <div className="stack xs">
        <h2 className="t-headline">Meeting results</h2>
        <Note>{k.confirmed}</Note>
      </div>
      <EvSec title={`Tasks created (${k.tasks.length})`}>
        {k.tasks.map(([label, status]) => <Made key={label} label={label} status={status} />)}
        <Note>Tap a task to open its detail in Tasks.</Note>
      </EvSec>
      <EvSec title={`Decisions (${k.decisions.length})`}><Bullets items={k.decisions} /></EvSec>
      <EvSec title={`Information (${k.info.length})`}><Bullets items={k.info} /></EvSec>
      <EvSec title="Open questions (1)">
        <Box><p className="bold">{k.question.text}</p><p className="t-footnote muted">{k.question.meta}</p></Box>
      </EvSec>
      <div className="ev-sep" />
      <EvSec title="Minutes" tag={<Pill tone="success">Confirmed</Pill>}>
        <div className="ev-plain stack sm">
          <div className="stack xs"><Note>{source}</Note><Note>{by.join(' · ')}</Note></div>
          <p className="t-subhead">{KICKOFF_MINUTES}</p>
        </div>
        <Btn block go="events.step2">See full minutes</Btn>
      </EvSec>
    </Screen>
  );
}
