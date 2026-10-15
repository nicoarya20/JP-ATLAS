// Trash ① List and ② Empty: deleted items kept 30 days. Everyone can restore; only an Admin can delete forever.
import { Trash2 } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Chips, Empty, Label, Screen, Section } from '../../kit';

const KINDS = [['Projects', 'PROJECT'], ['Tasks', 'TASK'], ['Events', 'EVENT']];

/** Trash screen frame with the 30-day intro line. */
function TrashScreen({ children }) {
  return (
    <Screen title="Trash" back tab="more">
      <p className="t-subhead muted">Deleted items are kept 30 days, then gone for good.</p>
      {children}
    </Screen>
  );
}

/** Deleted item card (D.trash). Projects also show what they include. */
function Item({ t }) {
  const { is } = useApp();
  return (
    <Section className="tr-card">
      <div className="stack xs">
        <Label>{t.kind}</Label>
        <span className="t-headline">{t.title}</span>
        <span className="t-footnote muted">{t.where} · Deleted by {t.by} · {t.date}</span>
        <span className="t-footnote">{t.left} days left</span>
        {t.includes && <span className="t-footnote muted">Includes {t.includes}</span>}
      </div>
      <div className="tr-acts">
        {is('admin') && <Btn kind="ghost" sm sheet="trash.delete">Delete forever</Btn>}
        <Btn sm toast="Restored">Restore</Btn>
      </div>
    </Section>
  );
}

export function TrashList() {
  const counts = KINDS.map(([l, k]) => `${l} ${D.trash.filter(t => t.kind === k).length}`);
  return (
    <TrashScreen>
      <Chips items={[`All ${D.trash.length}`, ...counts]} />
      <section className="stack">
        <p className="t-footnote bold">{D.trash.length} items · removed automatically after 30 days</p>
        {D.trash.map(t => <Item key={t.title} t={t} />)}
      </section>
    </TrashScreen>
  );
}

export function TrashEmpty() {
  return (
    <TrashScreen>
      <Empty icon={<Trash2 size={40} aria-label="Empty trash" />} title="Trash is empty" text="What you delete stays here for 30 days." />
    </TrashScreen>
  );
}
