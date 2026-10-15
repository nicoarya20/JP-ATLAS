// Projects module shared parts: fixed bottom action bar, checkbox, labelled info line, page frame with a foot bar.
import { Checkbox } from '@react-cupertino-ui/checkbox';
import { Btn, Screen } from '../../kit';
import { D } from '../../data/sample';

/** Bottom action bar pinned under the scrolling content: a narrow left button + a wide right button. */
export function Foot({ children }) {
  return <div className="pj-foot">{children}</div>;
}

/** Cancel (back) + primary button foot, the common form ending. */
export function CancelFoot({ label, go, toast }) {
  return (
    <Foot>
      <Btn back>Cancel</Btn>
      <Btn kind="primary" go={go} toast={toast}>{label}</Btn>
    </Foot>
  );
}

/** Screen with a back button and a foot bar; content scrolls above the foot. */
export function FootScreen({ title, foot, children }) {
  return <Screen title={title} back className="pj-page">{children}{foot}</Screen>;
}

/** Tick box (local state only). label is optional visible text; aria = accessible name when there is no label. */
export function Check({ on = true, label, aria = 'Select' }) {
  return <Checkbox size="sm" variant="solid" defaultChecked={on} label={label} aria-label={label ? undefined : aria} />;
}

/** Small muted label above a value. */
export function Info({ label, children }) {
  return (
    <div className="stack xs">
      <span className="t-footnote muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** Full names of the two helpers from the attendance story (Dodi, Rina), minus the signed-in person. */
export const helpers = () => ['dodi', 'rina'].filter(k => k !== D.me().key).map(k => D.person(k).full);
