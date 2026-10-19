// Buttons and selection controls. Nav props on every clickable kit part: {go, sheet, back, close, toast, replace, task, params}.
import { useState } from 'react';
import { Button } from '@react-cupertino-ui/button';
import { SegmentedControl } from '@react-cupertino-ui/segmented-control';
import { SuggestionChip } from '@react-cupertino-ui/suggestion-chip';
import { Tabs as LibTabs, TabsList, TabsTrigger } from '@react-cupertino-ui/tabs';
import { useApp, useNav } from '../core/app.context';

/** Pull the nav props out of a props object: [navProps, rest]. */
export function splitNav({ go, sheet, back, close, toast, replace, task, params, ...rest }) {
  return [{ go, sheet, back, close, toast, replace, task, params }, rest];
}

const BTN_VARIANT = { primary: 'solid', outline: 'outline', ghost: 'ghost', danger: 'destructive', plain: 'link' };

/** Button. kind: 'primary' | 'outline' | 'ghost' | 'danger' | 'plain'; block = full width; sm = small; icon = lucide element. */
export function Btn({ children, kind = 'outline', block, sm, icon, disabled, ...props }) {
  const [nav, rest] = splitNav(props);
  const onClick = useNav(nav);
  if (!BTN_VARIANT[kind]) throw new Error(`Btn kind "${kind}" unknown`);
  return (
    <Button variant={BTN_VARIANT[kind]} size={sm ? 'sm' : 'default'} fullWidth={!!block} icon={icon}
      disabled={disabled} onClick={onClick} {...rest}>{children}</Button>
  );
}

/** Text link button ("See all"). */
export function Link({ children, className = '', ...props }) {
  const [nav, rest] = splitNav(props);
  return <button type="button" className={`link ${className}`.trim()} onClick={useNav(nav)} {...rest}>{children}</button>;
}

/** Index of the item the user picked; also navigates when gos[i] is set (gos = screen ids, same order as items). */
function usePick(on, gos, onPick) {
  const { go } = useApp();
  const [picked, setPicked] = useState(on);
  const pick = i => { setPicked(i); if (onPick) onPick(i); else if (gos?.[i]) go(gos[i]); };
  return [picked, pick];
}

/** Single-select chip row (filters). items = labels; on = initially active index; gos = optional targets;
 *  onPick(i) = told about every pick (replaces gos); bleed = scroll edge to edge instead of clipping at the content padding. */
export function Chips({ items, on = 0, gos, onPick, bleed }) {
  const [picked, pick] = usePick(on, gos, onPick);
  return (
    <div className={`hscroll chips${bleed ? ' bleed' : ''}`}>
      {items.map((label, i) => (
        <SuggestionChip key={label} size="sm" variant="secondary" active={i === picked} aria-pressed={i === picked}
          onClick={() => pick(i)}>{label}</SuggestionChip>
      ))}
    </div>
  );
}

/** Segmented control. items = labels; on = active index; gos[i] optionally navigates; onPick(i) replaces gos when
 *  the target depends on other state. icons = optional lucide elements (same order): the segments show only the icon
 *  and keep the label for screen readers. */
export function Seg({ items, on = 0, gos, onPick, icons }) {
  const [picked, pick] = usePick(on, gos, onPick);
  // --seg-n / --seg-i place the thumb (library.css): upstream shifts it by its own width × index / n, so item 2 of 2 stopped halfway.
  return (
    <div className={`seg${icons ? ' seg-icons' : ''}`} style={{ '--seg-n': items.length, '--seg-i': picked }}>
      <SegmentedControl variant="solid" size="sm" fullWidth value={String(picked)}
        options={items.map((label, i) => ({ value: String(i), label, icon: icons?.[i] }))} onChange={v => pick(Number(v))} />
    </div>
  );
}

/** Underline tabs (screen sections). items = labels; on = active index; gos[i] optionally navigates. */
export function Tabs({ items, on = 0, gos }) {
  const [picked, pick] = usePick(on, gos);
  return (
    <LibTabs value={String(picked)} onValueChange={v => pick(Number(v))} variant="underline" size="sm" className="bleed">
      <TabsList>
        {items.map((label, i) => <TabsTrigger key={label} value={String(i)}>{label}</TabsTrigger>)}
      </TabsList>
    </LibTabs>
  );
}
