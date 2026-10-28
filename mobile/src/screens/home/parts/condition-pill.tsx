// How a project is doing, as the server judges it (`condition`), in its own pair of colours. Not the
// shared StatusPill: its vocabulary is the lifecycle statuses ("Active", "Done"), and an unknown word
// there reads as neutral — "At risk" drawn neutral would be the wrong kind of quiet.
import { Badge, BadgeText } from '@/components/ui/badge';
import type { ProjectCondition } from '@/data/home.types';

import { CONDITION } from '../home.strings';

const TONE = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'destructive',
} as const;

/** The condition as a pill; a project the server has no judgement on gets none. */
export function ConditionPill({ condition }: { condition: ProjectCondition | null }) {
  if (!condition) return null;
  return (
    <Badge variant={TONE[condition]}>
      <BadgeText>{CONDITION[condition]}</BadgeText>
    </Badge>
  );
}
