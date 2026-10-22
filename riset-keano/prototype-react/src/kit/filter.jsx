// Filter & sort pieces shared by the list screens (Tasks, Events): the search field with a grey square filter icon on
// its right, and the body of the full-height overlay that icon opens (fields edit a draft, Reset / Apply at the bottom).
import { SlidersHorizontal } from 'lucide-react';
import { Btn } from './controls';
import { Search } from './form';
import './filter.css';

/** Search field with the filter icon on its right; on = the list's query narrows it (a dot on the icon). */
export function SearchFilter({ placeholder, on, onFilter }) {
  return (
    <div className="search-filter">
      <div className="grow"><Search placeholder={placeholder} /></div>
      <button type="button" className={`filter-btn${on ? ' is-on' : ''}`} aria-label="Filter and sort" onClick={onFilter}>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Overlay body: the title (a drag zone, so the overlay swipes down from there too), the fields, then Reset / Apply. */
export function FilterPanel({ onReset, onApply, children }) {
  return (
    <div className="filter-panel">
      <h2 className="t-title2" data-sheet-drag="">Filter &amp; sort</h2>
      {children}
      <div className="filter-foot">
        <Btn block onClick={onReset}>Reset</Btn>
        <Btn kind="primary" block onClick={onApply}>Apply</Btn>
      </div>
    </div>
  );
}
