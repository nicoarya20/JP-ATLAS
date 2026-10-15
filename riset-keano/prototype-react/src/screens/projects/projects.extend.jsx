// Projects ⑫: extend-deadline sheet (opened from the detail header, Manager/Admin only).
import { Radio } from '@react-cupertino-ui/radio';
import { Btn, Field, Section, Sheet } from '../../kit';
import { D } from '../../data/sample';

const REASONS = ['Scope increased', 'Waiting on third party', 'Estimate was off', 'Short-staffed', 'Other'];

export default function ProjectsExtend() {
  const X = D.atlas.extend;
  const actions = (
    <div className="pj-grid2">
      <Btn close>Cancel</Btn>
      <Btn kind="primary" block close toast="Deadline extended">Save</Btn>
    </div>
  );
  return (
    <Sheet title="Extend deadline" actions={actions}>
      <div className="pj-grid2">
        <div className="stack sm"><span className="t-subhead bold">Current deadline</span><span className="t-headline">{X.current}</span></div>
        <Field label="New deadline *" value={X.next} />
      </div>
      <span className="t-subhead muted">Example error: “New deadline must be after {X.current}.”</span>
      <div className="field">
        <span className="t-footnote muted">Why extend? *</span>
        <div className="pj-grid2" role="radiogroup" aria-label="Why extend?">
          {REASONS.map((r, i) => <Radio key={r} variant="solid" name="pj-extend-reason" size="sm" defaultChecked={i === 0} label={r} />)}
        </div>
      </div>
      <Field label="Reason *" value={X.reason} area />
      <Section className="pj-soft">
        <div className="stack sm"><span className="t-subhead bold">Impact of change</span><span className="t-subhead">{X.impact}</span></div>
      </Section>
      <span className="t-subhead muted">Recorded in Deadline history and Project activity.</span>
    </Sheet>
  );
}
