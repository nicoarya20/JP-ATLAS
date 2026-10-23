// ClickUp-style stacked tab screen (Home, Tasks, Projects, Events): a header on surface, the search block under it, and
// the content as a rounded sheet laid over both. Scrolling the sheet up pushes the search block away into a header icon.
import { useRef } from 'react';
import { Search } from 'lucide-react';
import { Screen } from './layout';
import { useSearchCollapse } from './stacked.collapse';
import './stacked.css';

/**
 * Tab screen with the stacked header. title = left of the header; aside = after the search icon on the right (Home's
 * avatar); find = the search block's content; onFind = what the header icon does once the block is collapsed (default:
 * scroll back and focus the block's field). Only one of the block and the icon is reachable at a time.
 * The sheet's rounded top edge sticks under the header; pinned = an optional first row of the sheet that sticks with it;
 * scrolled past the search block it compacts with the scroll: style its compact form from --stk-q (0 tall .. 1 compact),
 * keeping every height it changes linear in --stk-q (the hook measures only the two ends).
 * props: {title, aside, find, onFind, pinned, tab, children}.
 */
export function StackedScreen({ title, aside, find, onFind, pinned, tab, children }) {
  const pinRef = useRef(null);
  const [blockRef, collapsed, reveal] = useSearchCollapse(pinRef);
  const header = (
    <header className="stk-head between">
      <h1 className="t-title2">{title}</h1>
      <div className="row-flex">
        <button type="button" className="stk-find-ico" aria-label="Search" aria-hidden={!collapsed}
          inert={collapsed ? undefined : ''} onClick={onFind ?? reveal}>
          <Search size={20} aria-hidden="true" />
        </button>
        {aside}
      </div>
    </header>
  );
  return (
    <Screen header={header} tab={tab} className="stk-scroll">
      <div ref={blockRef} className="stk-find" aria-hidden={collapsed} inert={collapsed ? '' : undefined}>{find}</div>
      {pinned
        ? <div ref={pinRef} className="stk-pin"><div className="stk-pin-in">{pinned}</div></div>
        : <div className="stk-edge" aria-hidden="true" />}
      <div className={`stk-sheet${pinned ? ' has-pin' : ''}`}>{children}</div>
    </Screen>
  );
}
