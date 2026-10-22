// ⋯ menu for a nav bar: the icon in the label colour (like the back chevron), a dropdown of actions under it.
// A tap on an item runs its nav props and closes the menu; a tap anywhere else closes it too.
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { useNav } from '../core/app.context';
import { splitNav } from './controls';
import './menu.css';

/** The item closes the menu itself: useNav stops the click from bubbling, so the menu never hears it. */
function MenuItem({ item, onDone }) {
  const [nav] = splitNav(item);
  const run = useNav(nav);
  const click = e => { onDone(); run?.(e); };
  return <button type="button" role="menuitem" className={item.danger ? 'danger' : undefined} onClick={click}>{item.label}</button>;
}

/** ⋯ button + dropdown. items = [{label, danger?, ...nav props (go, sheet, task, toast…)}]; label = the button's name. */
export function Menu({ items, label = 'More' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu-wrap">
      <button type="button" className="menu-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Ellipsis size={24} aria-hidden="true" />
      </button>
      {open && (
        <>
          <button type="button" className="menu-dim" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} />
          <div className="menu" role="menu" aria-label={label}>
            {items.map(item => <MenuItem key={item.label} item={item} onDone={() => setOpen(false)} />)}
          </div>
        </>
      )}
    </div>
  );
}
