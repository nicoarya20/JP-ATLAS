// Settings ③ Sheet · Leave. Copy differs per role: Members and PMs request, Admins set it directly.
import { Calendar } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { Btn, Field, Sheet } from '../../kit';

export const LEAVE = {
  member: { title: 'Request leave', hint: 'Request is sent to your project Manager or Admin.', save: 'Send request', toast: 'Leave request sent' },
  pm: { title: 'Request leave', hint: 'Request is sent to Admin.', save: 'Save', toast: 'Leave request sent' },
  admin: { title: 'Set leave', hint: 'Admin leave applies immediately, no approval.', save: 'Save leave', toast: 'Leave saved' },
};

export default function SettingsLeave() {
  const { role } = useApp();
  const l = LEAVE[role];
  return (
    <Sheet title={l.title} sub={l.hint}
      actions={(
        <div className="st-acts">
          <Btn close>Cancel</Btn>
          <Btn kind="primary" close toast={l.toast}>{l.save}</Btn>
        </div>
      )}>
      <div className="st-two">
        <Field label="From date" value="Mon, Oct 12, 2026" icon={<Calendar size={18} aria-hidden />} />
        <Field label="To date" value="Wed, Oct 14, 2026" icon={<Calendar size={18} aria-hidden />} />
      </div>
      <Field area label="Note (optional)" value="Family leave" />
    </Sheet>
  );
}
