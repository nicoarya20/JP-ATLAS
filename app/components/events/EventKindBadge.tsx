import type { EventKind } from '@server/pm/enums';
import { FiAlertCircle, FiCalendar, FiCheckSquare, FiCoffee, FiUsers } from 'react-icons/fi';
import { LabelBadge } from '~/components/pm/LabelBadge';
import { EVENT_KIND_LABELS } from '~/lib/events-format';
import type { PmLabel } from '~/lib/pm-labels';

const KIND_BADGES: Record<EventKind, PmLabel> = {
  meeting: { label: EVENT_KIND_LABELS.meeting, icon: FiUsers, color: 'blue' },
  review: { label: EVENT_KIND_LABELS.review, icon: FiCheckSquare, color: 'grape' },
  important: { label: EVENT_KIND_LABELS.important, icon: FiAlertCircle, color: 'warn' },
  team: { label: EVENT_KIND_LABELS.team, icon: FiCoffee, color: 'ok' },
  other: { label: EVENT_KIND_LABELS.other, icon: FiCalendar, color: 'gray' },
};

/** The kind of an event as icon + words, never colour alone. */
export function EventKindBadge({ kind }: { kind: EventKind }) {
  return <LabelBadge spec={KIND_BADGES[kind]} />;
}
