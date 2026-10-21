// Form-ish parts: dropdown pill (Select), search field, on/off switch, small section label, snackbar with an action.
import { useEffect, useRef, useState } from 'react';
import { SearchBar } from '@react-cupertino-ui/search-bar';
import { Switcher } from '@react-cupertino-ui/switcher';
import { ChevronDown } from 'lucide-react';
import { useNav } from '../core/app.context';
import { splitNav } from './controls';

/** Dropdown pill. block = full width. With options ([{value, label}]) it is a real picker: a transparent native
 *  <select> over the pill opens the OS menu, value is the picked value, onChange(value), label names it for screen
 *  readers. Without options the prototype has no menu, so a tap fires its nav props (usually `toast`). */
export function Select({ children, block, options, value, onChange, label, ...props }) {
  const [nav, rest] = splitNav(props);
  const onClick = useNav(nav);
  const cls = `select${block ? ' block' : ''}`;
  if (options) {
    return (
      <span className={`${cls} select-native`}>
        <span className="ellipsis">{options.find(o => o.value === value)?.label}</span>
        <ChevronDown size={16} aria-hidden="true" />
        <select className="select-pick" value={value} aria-label={label} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </span>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} {...rest}>
      <span className="ellipsis">{children}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
  );
}

/**
 * iOS search field without a Cancel button: a press anywhere outside it lets go of the field and clears the text
 * (keep = only let go, for a screen whose results come from the text). Local text unless value + onChangeValue are
 * given (the prototype does not filter); other props go to the library SearchBar (e.g. showVoice, onVoicePress).
 */
export function Search({ placeholder, value, onChangeValue, keep = false, ...bar }) {
  const [own, setOwn] = useState('');
  const text = value ?? own, setText = onChangeValue ?? setOwn;
  const wrap = useRef(null);
  const [focused, setFocused] = useState(false);
  // iOS Safari keeps an input focused after a tap on plain content, so any press outside the field blurs it here.
  useEffect(() => {
    if (!focused) return undefined;
    const onDown = e => { if (!wrap.current.contains(e.target)) wrap.current.querySelector('input').blur(); };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [focused]);
  const onBlur = e => {
    if (wrap.current.contains(e.relatedTarget)) return;   // focus moved to the clear button inside the field
    setFocused(false);
    if (!keep) setText('');
  };
  return (
    <div ref={wrap} className="search" onFocus={() => setFocused(true)} onBlur={onBlur}>
      <SearchBar value={text} onChangeValue={setText} placeholder={placeholder} showVoice={false} glass={false} {...bar} />
    </div>
  );
}

/** On/off switch. on = initial state; label is read by screen readers when no visible label sits next to it;
 *  onChange(checked) is told about every flip (for state that must outlive the switch). */
export function Switch({ on = false, label, onChange }) {
  const [checked, setChecked] = useState(on);
  const flip = v => { setChecked(v); onChange?.(v); };
  return <Switcher checked={checked} onCheckedChange={flip} aria-label={label} glass={false} />;
}

/** Small uppercase label above a group (iOS grouped-table header). */
export function Label({ children }) {
  return <h3 className="label-head t-footnote muted">{children}</h3>;
}

/** Snackbar pinned above the tab bar: text + one action button (nav props, or onAction, go to the action). */
export function Snack({ children, action, onAction, ...props }) {
  const [nav] = splitNav(props);
  const onNav = useNav(nav);
  return (
    <div className="snack" role="status">
      <span className="grow">{children}</span>
      <button type="button" className="snack-action" onClick={onAction || onNav}>{action}</button>
    </div>
  );
}
