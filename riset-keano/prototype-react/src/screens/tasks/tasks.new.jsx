// Tasks ⑤ and ⑦: new task by writing (AI draft) and the CSV import preview; ⑥ Fill form lives in tasks.form.jsx.
import { Sparkles } from 'lucide-react';
import { Btn, Chips, Link, Pill, Section, Seg } from '../../kit';
import { D } from '../../data/sample';
import { Foot, FootScreen, SelectField, Tick } from './tasks.parts';
import { atlas } from './tasks.shared';

function DraftCard({ d }) {
  return (
    <Section>
      <div className="row-flex tk-top">
        <Tick on aria="Include" />
        <div className="stack sm grow">
          <span className="t-headline">{d.title}</span>
          <span className="row-flex wrap">
            <Pill tone="outline">Assignee: {d.who}</Pill><Pill tone="outline">Due: {d.due}</Pill>
            <Pill tone="outline">Priority: {d.priority}</Pill><Pill tone="outline">Type: {d.type}</Pill>
          </span>
        </div>
      </div>
    </Section>
  );
}

/** ⑤ New task · Just write — AI drafts tasks from a story; nothing is saved before Save. */
export function TasksWrite() {
  const QW = D.quickWrite, n = QW.drafts.length;
  const foot = (
    <Foot>
      <Btn toast="Editing text">Edit text</Btn>
      <Btn kind="primary" go="tasks.my" toast="Tasks saved">Save {n} tasks</Btn>
    </Foot>
  );
  return (
    <FootScreen title="New task" foot={foot}>
      <Seg items={['Just write ✦', 'Fill form']} on={0} gos={['', 'tasks.form']} />
      <SelectField label="Project">{atlas().name}</SelectField>
      <textarea className="field-area" defaultValue={QW.text} rows={4} aria-label="What needs to be done" />
      <div className="between">
        <span className="t-footnote muted">Speak · coming soon</span>
        <Btn toast="AI drafted the tasks"><span className="row-flex">Compose <Sparkles size={16} /></span></Btn>
      </div>
      <Section className="tk-soft">
        <div className="between t-footnote">
          <span className="row-flex bold"><Sparkles size={16} className="tint" /> Draft from AI. Check before saving.</span>
          <span className="muted">{n} tasks</span>
        </div>
      </Section>
      {QW.drafts.map(d => <DraftCard key={d.title} d={d} />)}
      <p className="t-footnote muted">Example when a name is ambiguous, AI asks one thing:</p>
      <Section className="tk-soft">
        <div className="stack sm">
          <span className="t-headline row-flex"><Sparkles size={16} className="tint" /> Which {QW.ask[0].split(' ')[0]}?</span>
          <Chips items={QW.ask} on={-1} />
        </div>
      </Section>
    </FootScreen>
  );
}

const isError = state => state.startsWith('✕');

function CsvRow({ row: [title, email, due, state, note], i }) {
  return (
    <Section className={isError(state) ? 'tk-soft tk-strong' : ''}>
      <div className="stack sm">
        <div className="between">
          <span className="row-flex"><span className="t-footnote muted">Row {i + 1}</span><span className="t-headline">{title}</span></span>
          <span className="t-footnote bold nowrap">{state}</span>
        </div>
        <span className="t-footnote">
          {email === '—' ? '(empty → no assignee) · (empty → Medium) · (empty → no due date)' : `${email} · Due ${due}`}
        </span>
        {note && <span className="t-footnote bold">{note}</span>}
      </div>
    </Section>
  );
}

/** ⑦ Import CSV — error rows are skipped; rows with notes still import; blanks get defaults. */
export function TasksCsv() {
  const C = D.csv, ok = C.rows.filter(r => !isError(r[3])).length;
  const foot = (
    <Foot>
      <Btn back>Cancel</Btn>
      <Btn kind="primary" go="tasks.all" toast="Tasks imported">Import {ok} tasks</Btn>
    </Foot>
  );
  return (
    <FootScreen title="Import CSV" foot={foot}>
      <h2 className="t-title2">Import tasks from CSV</h2>
      <div className="between t-footnote">
        <span>To project: <b>{atlas().name}</b></span>
        <Btn kind="ghost" sm toast="Sample CSV downloaded">Download sample CSV</Btn>
      </div>
      <Seg items={['Upload file', 'Paste text']} />
      <Section className="tk-soft">
        <div className="between"><span className="t-subhead">{C.file}</span><Link toast="Choose another file">Change file</Link></div>
      </Section>
      <div className="stack xs"><h3 className="t-headline">Preview</h3><p className="t-footnote muted">{C.summary}</p></div>
      {C.rows.map((row, i) => <CsvRow key={row[0]} row={row} i={i} />)}
      <p className="t-footnote muted">Error rows are not imported. Rows with notes are still imported.</p>
    </FootScreen>
  );
}
