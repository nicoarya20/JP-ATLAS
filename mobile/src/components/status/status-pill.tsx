import { Badge, BadgeText } from '@/components/ui/badge';

import { statusTone } from './status';

/** A status word in its Atlas pair (text on its soft background), the same everywhere. */
export function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant={statusTone(status)}>
      <BadgeText>{status}</BadgeText>
    </Badge>
  );
}
