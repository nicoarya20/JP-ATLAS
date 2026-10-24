// Small uppercase label above a group of controls (prototype kit Label, an iOS grouped-table header).
import { Text } from '@/components/ui/text';

/** "STATUS", "SORT BY": names the controls under it. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="text-footnote uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </Text>
  );
}
