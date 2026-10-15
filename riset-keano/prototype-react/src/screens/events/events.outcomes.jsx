// Events ⑦a–⑦c: meeting outcomes in 3 steps (recording → text → tasks) for the Atlas daily stand-up (D.standup).
// Nothing is created until "Create tasks" is tapped; a Member only reads and waits for the event creator to confirm.
import { Camera, ChevronRight, PenLine, Play, Upload } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Field, Link, Pill, Progress, Screen } from '../../kit';
import { Ai, Box, EvFoot, EvSec, Note, Two } from './events.parts';
import { PROJECT } from './events.shared';

/** Meeting-outcomes frame: back + title, optional sticky footer. */
function Outcomes({ foot, children }) {
  return (
    <Screen back title="Meeting outcomes" className={foot ? 'ev-has-foot' : undefined}>
      {children}
      {foot && <EvFoot>{foot}</EvFoot>}
    </Screen>
  );
}

/** "Step n of 3" header with a progress bar. */
function StepHead({ n, label }) {
  return (
    <div className="stack xs">
      <span className="t-footnote muted">Step {n} of 3</span>
      <h1 className="t-title2">{label}</h1>
      <Progress value={Math.round(n / 3 * 100)} />
    </div>
  );
}

/** Events ⑦a: recording done, turn it into text. */
export function Step1() {
  const s = D.standup;
  const play = useNav({ toast: 'Playing the recording' });
  return (
    <Outcomes>
      <StepHead n={1} label="Recording done" />
      <div className="ev-box row-flex">
        <button type="button" className="ev-play" aria-label="Play recording" onClick={play}>
          <Play size={20} fill="currentColor" aria-hidden="true" />
        </button>
        <span className="stack xs grow">
          <span className="t-headline">Recording · {s.length}</span>
          <Note>{s.saved}. Raw audio is deleted 30 days after confirmation.</Note>
        </span>
      </div>
      <Btn kind="primary" block go="events.step2"><span className="row-flex ev-gap-1">Turn into text <Ai /></span></Btn>
      <EvSec title="Other ways">
        <Btn block icon={<PenLine size={16} />} go="events.step2">Type it myself</Btn>
        <Btn block icon={<Camera size={16} />} toast="Take a photo of the notes">
          <span className="row-flex ev-gap-1">Photo of notes <Ai /></span>
        </Btn>
        <Btn block icon={<Upload size={16} />} toast="Pick an audio file">Upload a recording</Btn>
      </EvSec>
      <Note><Ai /> = AI-assisted. You can check and edit the text in the next step.</Note>
    </Outcomes>
  );
}

/** Events ⑦b: editable minutes text. */
export function Step2() {
  const s = D.standup;
  const foot = (
    <>
      <Two wide>
        <Btn block back toast="Draft saved">Save and exit</Btn>
        <Btn kind="primary" block go="events.step3">Next <ChevronRight size={16} aria-hidden="true" /></Btn>
      </Two>
      <Note>Next: AI sorts out tasks from this text</Note>
    </>
  );
  return (
    <Outcomes foot={foot}>
      <StepHead n={2} label="Check the text" />
      <div className="ev-tall"><Field area label="Minutes · editable" value={s.transcript.join('\n')} /></div>
      <Note>{s.by}</Note>
    </Outcomes>
  );
}

/** Draft task from D.standup.tasks; one without a due date gets a warning. Member sees no actions. */
function Draft({ title, meta }) {
  const { is } = useApp();
  return (
    <div className="ev-plain ev-task">
      <span className="stack xs">
        <span className="t-headline">{title}</span>
        <span className="t-footnote muted row-flex ev-gap-1"><Avatar size="sm" name={meta.match(/^For (\w+)/)[1]} /> {meta}</span>
      </span>
      {meta.includes('No due date') && <span className="ev-warn">Fill in the due date first</span>}
      {!is('member') && (
        <div className="ev-task-acts">
          <Btn sm toast="Edit task">Edit</Btn>
          <Btn kind="ghost" sm toast="Removed from the list">{is('admin') ? 'Discard' : 'Remove'}</Btn>
        </div>
      )}
    </div>
  );
}

/** Drafts plus the "1 decision, 1 info, 1 question" line (matches the transcript). */
function Drafts() {
  return (
    <>
      {D.standup.tasks.map(t => <Draft key={t.title} {...t} />)}
      <div className="ev-box between t-subhead">
        <span>1 decision, 1 info, 1 question</span>
        <Link toast="Decisions, info and questions">View</Link>
      </div>
    </>
  );
}

/** Events ⑦c: tasks found in the minutes; PM/Admin create them, Member waits. */
export function Step3() {
  const { is } = useApp();
  const confirmer = D.event('daily').creator;
  const count = D.standup.tasks.length;
  if (is('member')) {
    return (
      <Outcomes>
        <StepHead n={3} label="Tasks from this meeting" />
        <div className="ev-pills"><Pill tone="accent">{`Waiting for ${confirmer} to review`}</Pill></div>
        <Box><p className="bold">Waiting for {confirmer} to confirm</p><p className="muted">You can only read these meeting outcomes.</p></Box>
        <Drafts />
      </Outcomes>
    );
  }
  const foot = (
    <>
      <Btn kind="primary" block go="events.list" toast={`${count} tasks created · outcomes confirmed`}>{`Create ${count} tasks`}</Btn>
      <Note>Tasks go into {PROJECT()} and assignees are notified.</Note>
    </>
  );
  return (
    <Outcomes foot={foot}>
      <StepHead n={3} label="Tasks from this meeting" />
      <p className="t-subhead">AI found {count} tasks. Nothing is created until you tap the button below.</p>
      <Drafts />
    </Outcomes>
  );
}
