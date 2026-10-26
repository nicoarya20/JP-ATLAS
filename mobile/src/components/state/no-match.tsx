// "No tasks match these filters." (prototype NoMatch in tasks/projects/events lists): the filtered list came up empty.
import { SearchX } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';

import { EmptyState } from './empty-state';

export const NO_MATCH = { icon: 'No matches', reset: 'Reset filters' } as const;

type NoMatchProps = {
  /** "No tasks match these filters." */
  title: string;
  text?: string;
  /** Puts the list's query back to its default. */
  onReset: () => void;
};

/** Empty state for a filtered list, with Reset filters as its one action. */
export function NoMatch({ title, text, onReset }: NoMatchProps) {
  return (
    <EmptyState
      testID="no-match"
      icon={SearchX}
      iconLabel={NO_MATCH.icon}
      title={title}
      text={text}
      action={
        <Button onPress={onReset}>
          <ButtonText>{NO_MATCH.reset}</ButtonText>
        </Button>
      }
    />
  );
}
