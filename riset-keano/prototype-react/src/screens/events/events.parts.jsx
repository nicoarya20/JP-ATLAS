// Small layout pieces shared by the events screens: title + pills head, labelled field, section, bullets, sticky footer.
import { Sparkles } from 'lucide-react';

/** Event title with its status pills. */
export function EvHead({ title, children }) {
  return (
    <div className="stack sm">
      <h1 className="t-title2">{title}</h1>
      <div className="ev-pills">{children}</div>
    </div>
  );
}

/** Form group with a small label above a non-text control (Seg, Chips, Select). */
export function EvField({ label, hint, children }) {
  return (
    <div className="field">
      <span className="t-footnote muted">{label}</span>
      {children}
      {hint && <p className="t-footnote muted">{hint}</p>}
    </div>
  );
}

/** Untinted section: headline + optional trailing tag (a Pill), then its content. */
export function EvSec({ title, tag, children }) {
  return (
    <section className="stack sm">
      <div className="row-flex"><h2 className="t-headline">{title}</h2>{tag}</div>
      {children}
    </section>
  );
}

/** Bulleted list. */
export function Bullets({ items }) {
  return <ul className="ev-bul t-subhead">{items.map(t => <li key={t}>{t}</li>)}</ul>;
}

/** Footnote in secondary colour. */
export function Note({ children }) {
  return <p className="t-footnote muted">{children}</p>;
}

/** Grey info box. */
export function Box({ children }) {
  return <div className="ev-box t-subhead">{children}</div>;
}

/** Marks an AI-assisted action. */
export function Ai() {
  return <Sparkles size={15} className="tint" aria-label="AI-assisted" />;
}

/** Action bar pinned to the bottom of the screen (use with Screen className="ev-has-foot"). */
export function EvFoot({ children }) {
  return <div className="ev-foot">{children}</div>;
}

/** Two buttons side by side; wide = second one larger. */
export function Two({ wide, children }) {
  return <div className={`ev-two${wide ? ' wide' : ''}`}>{children}</div>;
}
