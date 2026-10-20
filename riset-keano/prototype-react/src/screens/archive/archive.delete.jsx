// Archive ④ Sheet · Delete forever (Admin only), for the archived item named in the sheet params (else the first
// archived project). Deleting is still only a toast.
import { D } from '../../data/sample';
import { Btn, Section, Sheet } from '../../kit';

const KIND = { PROJECT: 'Project', TASK: 'Task', EVENT: 'Event' };

export default function ArchiveDelete({ params }) {
  const it = D.archive.find(a => a.title === params?.title) || D.archive.find(a => a.kind === 'PROJECT');
  const kind = KIND[it.kind];
  return (
    <Sheet title="Delete forever?" sub={`${kind} · ${it.title}`}
      actions={(
        <div className="ar-two">
          <Btn close>Cancel</Btn>
          <Btn kind="danger" close toast="Deleted forever">Delete forever</Btn>
        </div>
      )}>
      <p className="t-subhead">{kind} “{it.title}”{it.includes ? ` with ${it.includes}` : ''} will be gone for good. This cannot be undone.</p>
      <Section className="ar-note"><span className="t-footnote">Only an Admin can delete forever. Others can only restore.</span></Section>
    </Sheet>
  );
}
