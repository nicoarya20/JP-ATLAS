// A Home card that may not have its data: every section of GET /api/app/home is a Widget, so one
// failing query shows "Try again" on its own card instead of blanking the screen (map §1b).
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { FailedState } from '@/components/state/section-state';
import type { Widget } from '@/data/home.types';
import { SectionCard } from './section-card';

type WidgetPartProps<T> = {
  section: Widget<T>;
  /** Re-reads the whole payload: there is one endpoint behind every card. */
  onRetry: () => void;
  testID?: string;
  children: (data: T) => ReactNode;
};

/** The part of a card that depends on one section, or why that section is not there. */
export function WidgetPart<T>({ section, onRetry, testID, children }: WidgetPartProps<T>) {
  // The server never sends the cause of a failed section (it is logged there), so there is no
  // message to pass on — only the honest offer to try again.
  if (!section.ok) return <FailedState testID={testID} onRetry={onRetry} />;
  return <>{children(section.data)}</>;
}

type WidgetCardProps<T> = WidgetPartProps<T> & { title: string; sub?: string; icon?: LucideIcon };

/** A whole card whose body is one section. */
export function WidgetCard<T>({ title, sub, icon, ...part }: WidgetCardProps<T>) {
  return (
    <SectionCard title={title} sub={sub} icon={icon}>
      <WidgetPart {...part} />
    </SectionCard>
  );
}
