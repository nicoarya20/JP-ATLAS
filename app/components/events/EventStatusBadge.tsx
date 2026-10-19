import { FiCheckCircle, FiPlayCircle, FiXCircle } from 'react-icons/fi';
import { LabelBadge } from '~/components/pm/LabelBadge';
import { EVENT_STATUS_LABELS, type EventStatus } from '~/lib/events-format';
import type { PmLabel } from '~/lib/pm-labels';

const STATUS_BADGES: Record<Exclude<EventStatus, 'scheduled'>, PmLabel> = {
  canceled: { label: EVENT_STATUS_LABELS.canceled, icon: FiXCircle, color: 'danger' },
  ongoing: { label: EVENT_STATUS_LABELS.ongoing, icon: FiPlayCircle, color: 'blue' },
  ended: { label: EVENT_STATUS_LABELS.ended, icon: FiCheckCircle, color: 'gray' },
};

/** Dibatalkan / Berlangsung / Selesai; an event still to come shows no badge. */
export function EventStatusBadge({ status }: { status: EventStatus }) {
  return status === 'scheduled' ? null : <LabelBadge spec={STATUS_BADGES[status]} />;
}
