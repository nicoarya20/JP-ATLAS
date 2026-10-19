// Tasks module shared parts: page frame with a pinned foot bar, tick box, labelled select, detail section.
import { Checkbox } from '@react-cupertino-ui/checkbox';
import { Screen, Select } from '../../kit';

/** Bottom action bar pinned under the scrolling content. */
export function Foot({ children }) {
  return <div className="tk-foot">{children}</div>;
}

/** Screen with a back button and a foot bar; content scrolls above the foot. */
export function FootScreen({ title, right, foot, children }) {
  return <Screen title={title} back right={right} className="tk-page">{children}{foot}</Screen>;
}

/** Tick box (local state only). Clicks stay here so a tappable card around it does not open. */
export function Tick({ on = false, label, aria = 'Select' }) {
  return (
    <span className="tk-tick" onClick={e => e.stopPropagation()}>
      <Checkbox size="sm" variant="solid" defaultChecked={on} label={label} aria-label={label ? undefined : aria} />
    </span>
  );
}

/** Labelled dropdown look-alike showing its chosen value. */
export function SelectField({ label, children, toast }) {
  return (
    <div className="field">
      <span className="t-footnote muted">{label}</span>
      <Select block toast={toast}>{children}</Select>
    </div>
  );
}

/** Detail section: headline title (+ optional right element) over its content. */
export function Sec({ title, right, children }) {
  return (
    <section className="tk-sec">
      <div className="between"><h3 className="t-headline">{title}</h3>{right}</div>
      {children}
    </section>
  );
}
