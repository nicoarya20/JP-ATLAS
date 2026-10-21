// Content building blocks: cards, list rows, form fields, avatars, pills, progress, media placeholders, empty states.
import { useId } from 'react';
import { Avatar as LibAvatar } from '@react-cupertino-ui/avatar';
import { Badge } from '@react-cupertino-ui/badge';
import { Card } from '@react-cupertino-ui/card';
import { List, ListItem } from '@react-cupertino-ui/list';
import { ProgressBar } from '@react-cupertino-ui/progress-bar';
import { TextField } from '@react-cupertino-ui/text-field';
import { useNav } from '../core/app.context';
import { splitNav } from './controls';
import { statusTone } from './status';

/** Card section header: title + optional one-line meta, optional right element (a Link). */
export function Head({ title, sub, right }) {
  return (
    <div className="sec-head">
      <div className="grow">
        <h2 className="t-headline">{title}</h2>
        {sub && <p className="t-footnote muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Card. title/sub/right render a <Head>; nav props make the whole card tappable. */
export function Section({ title, sub, right, className = '', children, ...props }) {
  const [nav, rest] = splitNav(props);
  const onClick = useNav(nav);
  return (
    <Card glass={false} interactive={!!onClick} onClick={onClick} role={onClick ? 'button' : undefined}
      className={`card ${className}`.trim()} {...rest}>
      {title && <Head title={title} sub={sub} right={right} />}
      {children}
    </Card>
  );
}

/** Grouped list (iOS inset table). */
export function Rows({ children, plain }) {
  return <List variant={plain ? 'default' : 'inset'} className="rows">{children}</List>;
}

/** List row. lead = avatar/icon; right = trailing element; chev defaults to true when the row navigates. */
export function Row({ lead, title, sub, right, chev, ...props }) {
  const [nav, rest] = splitNav(props);
  const onClick = useNav(nav);
  return (
    <ListItem icon={lead} title={title} subtitle={sub} rightContent={right}
      chevron={chev ?? !!(nav.go || nav.sheet)} onClick={onClick} {...rest} />
  );
}

/** Form field. value = filled-in text; placeholder; area = multi-line; disabled; icon = trailing element; type = input type.
 *  With onChange(value) the field is controlled (value is the live text), else value is only where typing starts. */
export function Field({ label, value, placeholder, area, disabled, icon, type, onChange }) {
  const id = useId();
  const text = onChange ? { value, onChange: e => onChange(e.target.value) } : { defaultValue: value };
  if (area) {
    return (
      <label className="field">
        <span className="t-footnote muted">{label}</span>
        <textarea className="field-area" {...text} placeholder={placeholder} disabled={disabled} rows={4} />
      </label>
    );
  }
  // The label sits above the box: the library's floating label scales from its centre, so labels of different
  // lengths drift right by different amounts. variant="filled" keeps the library off its default glass look, but
  // BaseVariants has no "filled" key and emits no class, so the class is passed by hand for library.css.
  return (
    <div className="field">
      <label className="t-footnote muted" htmlFor={id}>{label}</label>
      <TextField id={id} variant="filled" className="variant-filled" type={type} {...text} placeholder={placeholder} disabled={disabled}
        rightIcon={icon} />
    </div>
  );
}

const AVATAR_SIZE = { sm: 'sm', md: 'default', lg: 'lg', xl: 'xl' };

/** Round avatar showing the name's initials. size: 'sm' | 'md' | 'lg' | 'xl'. */
export function Avatar({ name = '', size = 'md' }) {
  return <LibAvatar size={AVATAR_SIZE[size]} fallback={name} alt={name} />;
}

/** Overlapping avatars for a list of names. */
export function Avatars({ names }) {
  return <span className="avatars">{names.map(n => <Avatar key={n} name={n} size="sm" />)}</span>;
}

// info has no upstream variant: it reuses solid and library.css recolours it via the tone class.
const PILL_VARIANT = { neutral: 'glass', accent: 'solid', info: 'solid', success: 'success', warning: 'warning', danger: 'error',
  outline: 'outline' };

/** Small label. tone: 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'outline'. */
export function Pill({ children, tone = 'neutral' }) {
  if (!PILL_VARIANT[tone]) throw new Error(`Pill tone "${tone}" unknown`);
  return <Badge variant={PILL_VARIANT[tone]} size="sm" className={`tone-${tone}`}>{children}</Badge>;
}

/** Status label coloured by its word (see kit/status.js), so "On hold" looks the same on every screen. */
export function StatusPill({ status, children }) {
  return <Pill tone={statusTone(status)}>{children ?? status}</Pill>;
}

/** Progress bar, value 0..100. label shows above the bar; showValue prints the percentage. */
export function Progress({ value, label, showValue }) {
  return <ProgressBar value={value} max={100} size="sm" label={label} showValue={showValue} />;
}

/** Image placeholder box. size: 'sm' | 'md' | 'lg'. */
export function Media({ label = 'Image', size = 'md' }) {
  return <div className={`media media-${size}`} role="img" aria-label={label}>{label}</div>;
}

/** Empty state: icon (lucide element), title, text and an optional action (usually a <Btn>). */
export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty stack center">
      {icon && <div className="empty-icon">{icon}</div>}
      <h2 className="t-title3">{title}</h2>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}
