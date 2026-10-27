// Coloured icon tile at the start of a profile row (prototype profile.main.jsx Tile), in the Atlas soft pairs.
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';

/** One Atlas pair per hue, so neighbouring rows never share a colour (info and selected are the same violet). */
const TONE = {
  violet: 'bg-accent text-accent-foreground',
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-destructive',
  gray: 'bg-muted text-muted-foreground',
} as const;

/** Decorative: the row title names it. */
export function Tile({ icon, tone = 'gray' }: { icon: LucideIcon; tone?: keyof typeof TONE }) {
  const [bg, fg] = TONE[tone].split(' ');
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`h-8 w-8 items-center justify-center rounded-control ${bg}`}
    >
      <Icon as={icon} size="md" className={fg} />
    </View>
  );
}
