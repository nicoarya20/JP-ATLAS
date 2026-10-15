// Events ⑤ recording mode (ready) and ⑥ recording, for the Atlas daily stand-up. Recording starts only after consent.
import { useState } from 'react';
import { Checkbox } from '@react-cupertino-ui/checkbox';
import { Camera, Check, ChevronRight, Circle, Mic, PenLine } from 'lucide-react';
import { D } from '../../data/sample';
import { Btn, Link, Pill, Screen } from '../../kit';
import { Ai, EvFoot, EvHead, EvSec, Note, Two } from './events.parts';

function Head() {
  return (
    <EvHead title={D.event('daily').title}>
      <Pill tone="accent">Ongoing</Pill>
      <Pill tone="outline">Meeting</Pill>
    </EvHead>
  );
}

/** Events ⑤: consent box, Start recording, other ways to take notes. */
export function RecordReady() {
  const [told, setTold] = useState(false);
  return (
    <Screen back title="Recording mode">
      <Head />
      <Link className="ev-more-sm" go="events.step3">View meeting details <ChevronRight size={14} aria-hidden="true" /></Link>
      <div className="ev-plain stack sm">
        <Checkbox variant="solid" label="Attendees have been told this meeting is recorded" checked={told}
          onChange={e => setTold(e.target.checked)} />
        <Note>Required before recording</Note>
      </div>
      <div className="ev-rec">
        <span className="ev-rec-dot"><Mic size={36} aria-hidden="true" /></span>
        <Btn kind="primary" icon={<Circle size={14} fill="currentColor" />} go="events.recording">Start recording</Btn>
      </div>
      <EvSec title="Other ways">
        <Btn block icon={<PenLine size={16} />} go="events.step2">Type notes</Btn>
        <Btn block icon={<Camera size={16} />} toast="Take a photo of the whiteboard">
          <span className="row-flex ev-gap-1">Photo of whiteboard <Ai /></span>
        </Btn>
      </EvSec>
      <Note>Uses this phone's microphone. Put the phone in the middle of the table for clearer sound.</Note>
    </Screen>
  );
}

/** Events ⑥: recording in progress. */
export function Recording() {
  return (
    <Screen back title="Recording mode" className="ev-has-foot">
      <Head />
      <div className="ev-rec">
        <span className="ev-rec-dot live"><Mic size={36} aria-hidden="true" /></span>
        <Pill tone="danger">Recording</Pill>
        <span className="ev-timer">00:14:52</span>
        <span className="t-footnote muted row-flex ev-gap-1"><Check size={14} aria-hidden="true" /> Attendees told about the recording</span>
      </div>
      <Note>Keep the screen on and this app open while recording. Audio is saved as you go.</Note>
      <EvFoot>
        <Two wide>
          <Btn block toast="Recording paused">Pause</Btn>
          <Btn kind="primary" block go="events.step1">Stop recording</Btn>
        </Two>
      </EvFoot>
    </Screen>
  );
}
