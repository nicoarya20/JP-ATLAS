// Form-ish parts: dropdown pill (Select), search field, on/off switch, small section label, snackbar with an action.
import { useState } from 'react';
import { SearchBar } from '@react-cupertino-ui/search-bar';
import { Switcher } from '@react-cupertino-ui/switcher';
import { ChevronDown } from 'lucide-react';
import { useNav } from '../core/app.context';
import { splitNav } from './controls';

/** Dropdown look-alike. The prototype has no real menu, so a tap fires its nav props (usually `toast` listing the options). block = full width. */
export function Select({ children, block, ...props }) {
  const [nav, rest] = splitNav(props);
  return (
    <button type="button" className={`select${block ? ' block' : ''}`} onClick={useNav(nav)} {...rest}>
      <span className="ellipsis">{children}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
  );
}

/** iOS search field (local text only; the prototype does not filter). */
export function Search({ placeholder }) {
  const [text, setText] = useState('');
  return <SearchBar value={text} onChangeValue={setText} onCancel={() => setText('')} placeholder={placeholder} showVoice={false} glass={false} />;
}

/** On/off switch. on = initial state; label is read by screen readers when no visible label sits next to it. */
export function Switch({ on = false, label }) {
  const [checked, setChecked] = useState(on);
  return <Switcher checked={checked} onCheckedChange={setChecked} aria-label={label} glass={false} />;
}

/** Small uppercase label above a group (iOS grouped-table header). */
export function Label({ children }) {
  return <h3 className="label-head t-footnote muted">{children}</h3>;
}

/** Snackbar pinned above the tab bar: text + one action button (nav props go to the action). */
export function Snack({ children, action, ...props }) {
  const [nav] = splitNav(props);
  return (
    <div className="snack" role="status">
      <span className="grow">{children}</span>
      <button type="button" className="snack-action" onClick={useNav(nav)}>{action}</button>
    </div>
  );
}
