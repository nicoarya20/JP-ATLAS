// Trash ④ Sheet · Delete forever (Admin only).
import { Btn, Section, Sheet } from '../../kit';

export default function TrashDelete() {
  return (
    <Sheet title="Delete forever?" sub="Project · Senior app trial"
      actions={(
        <div className="tr-two">
          <Btn close>Cancel</Btn>
          <Btn kind="danger" close toast="Deleted forever">Delete forever</Btn>
        </div>
      )}>
      <p className="t-subhead">Project “Senior app trial” with 8 tasks and 2 events will be gone for good. This cannot be undone.</p>
      <Section className="tr-note"><span className="t-footnote">Only an Admin can delete forever. Others can only restore.</span></Section>
    </Sheet>
  );
}
