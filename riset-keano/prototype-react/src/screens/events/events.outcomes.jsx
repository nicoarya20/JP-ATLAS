// Events ⑦a–⑦c: meeting outcomes in 3 steps (recording → text → tasks) for the event in the screen params (else the
// Atlas daily stand-up); the minutes and draft tasks are the stand-up sample (D.standup). Nothing is created until
// "Create tasks" is tapped; a Member only reads and waits for the event creator to confirm.
import { useState } from 'react';
import { Camera, ChevronRight, PenLine, Play, Upload } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Field, Link, Pill, Progress, Screen, Select } from '../../kit';
import { Ai, Box, EvFoot, EvSec, Note, Two } from './events.parts';
import { TODAY } from './events.query';
import { EV, eventOf } from './events.shared';
import { confirmOutcomes, dateOn } from './events.store';

const LAST_DAY = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
/** Due date picks for a draft: today until the end of the month, as task due labels ("Oct 9"). */
const DUE_OPTIONS = [{ value: '', label: 'Pick a due date' }, ...Array.from({ length: LAST_DAY - TODAY.getDate() + 1 }, (_, i) => {
  const label = dateOn(TODAY.getDate() + i).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { value: label, label };
})];

/** The event whose outcomes these are, and the params that keep it on the next step. */
function useOutcomeEvent() {
  const { params } = useApp();
  const e = eventOf(params, 'daily');
  return [e, { event: e.id }];
}

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
  const [, p] = useOutcomeEvent();
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
      <Btn kind="primary" block go="events.step2" params={p}><span className="row-flex ev-gap-1">Turn into text <Ai /></span></Btn>
      <EvSec title="Other ways">
        <Btn block icon={<PenLine size={16} />} go="events.step2" params={p}>Type it myself</Btn>
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
  const [, p] = useOutcomeEvent();
  const foot = (
    <>
      <Two wide>
        <Btn block back toast="Draft saved">Save and exit</Btn>
        <Btn kind="primary" block go="events.step3" params={p}>Next <ChevronRight size={16} aria-hidden="true" /></Btn>
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

/** Draft task ({title, who, due}); one without a due date gets a date picker and blocks Create. onRemove / onDue are
 *  left out for a Member, who sees no actions. */
function Draft({ t, onRemove, onDue }) {
  const { is } = useApp();
  return (
    <div className="ev-plain ev-task">
      <span className="stack xs">
        <span className="t-headline">{t.title}</span>
        <span className="t-footnote muted row-flex ev-gap-1"><Avatar size="sm" name={t.who} /> For {t.who} · {t.due ? `Due ${t.due}` : 'No due date'}</span>
      </span>
      {!t.due && <span className="ev-warn">Fill in the due date first</span>}
      {!t.due && onDue && <Select block label={`Due date of ${t.title}`} options={DUE_OPTIONS} value="" onChange={onDue} />}
      {onRemove && (
        <div className="ev-task-acts">
          <Btn sm toast="Edit task">Edit</Btn>
          <Btn kind="ghost" sm onClick={onRemove}>{is('admin') ? 'Discard' : 'Remove'}</Btn>
        </div>
      )}
    </div>
  );
}

/** Drafts plus the "1 decision, 1 info, 1 question" line (matches the transcript). edit = {remove(i), due(i, date)}. */
function Drafts({ drafts, edit }) {
  const s = D.standup;
  const count = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return (
    <>
      {drafts.map((t, i) => <Draft key={t.title} t={t} onRemove={edit && (() => edit.remove(i))} onDue={edit && (d => edit.due(i, d))} />)}
      <div className="ev-box between t-subhead">
        <span>{count(s.decisions.length, 'decision')}, {s.info.length} info, {count(1, 'question')}</span>
        <Link toast="Decisions, info and questions">View</Link>
      </div>
    </>
  );
}

/** Events ⑦c: tasks found in the minutes; PM/Admin check them (remove, fill in due dates) and create them, Member waits. */
export function Step3() {
  const { is, go, toast } = useApp();
  const [e, p] = useOutcomeEvent();
  const [drafts, setDrafts] = useState(() => D.standup.tasks.map(t => ({ ...t })));
  if (is('member')) {
    return (
      <Outcomes>
        <StepHead n={3} label="Tasks from this meeting" />
        <div className="ev-pills"><Pill tone="accent">{`Waiting for ${e.creator} to review`}</Pill></div>
        <Box><p className="bold">Waiting for {e.creator} to confirm</p><p className="muted">You can only read these meeting outcomes.</p></Box>
        <Drafts drafts={drafts} />
      </Outcomes>
    );
  }
  const n = drafts.length;
  const ok = drafts.every(t => t.due);
  const edit = {
    remove: i => setDrafts(d => d.filter((_, j) => j !== i)),
    due: (i, due) => setDrafts(d => d.map((t, j) => (j === i ? { ...t, due } : t))),
  };
  const create = () => {
    confirmOutcomes(e.id, drafts, D.me().name);
    toast(`${n} ${n === 1 ? 'task' : 'tasks'} created · outcomes confirmed`);
    go('events.detail-confirmed', { top: true, params: p });
  };
  const foot = (
    <>
      <Btn kind="primary" block disabled={!ok} onClick={create}>{n ? `Create ${n} ${n === 1 ? 'task' : 'tasks'}` : 'Confirm without tasks'}</Btn>
      <Note>Tasks go into {EV.project(e)} and assignees are notified.</Note>
    </>
  );
  return (
    <Outcomes foot={foot}>
      <StepHead n={3} label="Tasks from this meeting" />
      <p className="t-subhead">AI found {D.standup.tasks.length} tasks. Nothing is created until you tap the button below.</p>
      <Drafts drafts={drafts} edit={edit} />
    </Outcomes>
  );
}
