// Content building blocks: cards, list rows, form fields, avatars, pills, progress, media placeholders, empty states.
import { Avatar as LibAvatar } from '@react-cupertino-ui/avatar';
import { Badge } from '@react-cupertino-ui/badge';
import { Card } from '@react-cupertino-ui/card';
import { List, ListItem } from '@react-cupertino-ui/list';
import { ProgressBar } from '@react-cupertino-ui/progress-bar';
import { TextField } from '@react-cupertino-ui/text-field';
import { useNav } from '../core/app.context';
import { splitNav } from './controls';

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

/** Form field. value = filled-in text; placeholder; area = multi-line; disabled; icon = trailing element. */
export function Field({ label, value, placeholder, area, disabled, icon }) {
  if (area) {
    return (
      <label className="field">
        <span className="t-footnote muted">{label}</span>
        <textarea className="field-area" defaultValue={value} placeholder={placeholder} disabled={disabled} rows={4} />
      </label>
    );
  }
  return (
    <TextField label={label} variant="filled" defaultValue={value} placeholder={placeholder} disabled={disabled}
      rightIcon={icon} />
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

const PILL_VARIANT = { neutral: 'glass', accent: 'solid', success: 'success', warning: 'warning', danger: 'error', outline: 'outline' };

/** Small status label. tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline'. */
export function Pill({ children, tone = 'neutral' }) {
  return <Badge variant={PILL_VARIANT[tone]} size="sm">{children}</Badge>;
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
