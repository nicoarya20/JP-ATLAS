// Archive ① List and ② Empty: archived items stay until restored. Everyone can restore; only an Admin can delete forever.
import { Archive } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Chips, Empty, Label, Screen, Section } from '../../kit';

const KINDS = [['Projects', 'PROJECT'], ['Tasks', 'TASK'], ['Events', 'EVENT']];

/** Archive screen frame with the intro line. */
function ArchiveScreen({ children }) {
  return (
    <Screen title="Archive" back tab="more">
      <p className="t-subhead muted">Archived items stay here until someone restores them.</p>
      {children}
    </Screen>
  );
}

/** Archived item card (D.archive). Projects also show what they include. */
function Item({ t }) {
  const { is } = useApp();
  return (
    <Section className="ar-card">
      <div className="stack xs">
        <Label>{t.kind}</Label>
        <span className="t-headline">{t.title}</span>
        <span className="t-footnote muted">{t.where} · Archived by {t.by} · {t.date}</span>
        {t.includes && <span className="t-footnote muted">Includes {t.includes}</span>}
      </div>
      <div className="ar-acts">
        {is('admin') && <Btn kind="ghost" sm sheet="archive.delete">Delete forever</Btn>}
        <Btn sm toast="Restored">Restore</Btn>
      </div>
    </Section>
  );
}

export function ArchiveList() {
  const counts = KINDS.map(([l, k]) => `${l} ${D.archive.filter(t => t.kind === k).length}`);
  return (
    <ArchiveScreen>
      <Chips items={[`All ${D.archive.length}`, ...counts]} />
      <section className="stack">
        <p className="t-footnote bold">{D.archive.length} items</p>
        {D.archive.map(t => <Item key={t.title} t={t} />)}
      </section>
    </ArchiveScreen>
  );
}

export function ArchiveEmpty() {
  return (
    <ArchiveScreen>
      <Empty icon={<Archive size={40} aria-label="Empty archive" />} title="Archive is empty" text="What you archive shows up here." />
    </ArchiveScreen>
  );
}
