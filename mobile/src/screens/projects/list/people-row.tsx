// Projects ① people row (prototype projects.people.jsx PeopleRow): the My projects chip (not for a Member), then a
// round avatar per teammate (40 pt, nearly the chip's height, in a 48 pt frame whose ring keeps a 2 pt gap), scrolled
// sideways. The frames touch, so the circles sit 8 pt apart; the chip keeps the same 8 pt from the first circle.
// One pick at a time; tapping the picked one again shows every project.
import { ScrollView } from 'react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { person } from '@/data/people';
import { WHO_ME } from '@/data/projects.people';

import { LIST } from '../projects.strings';

type PeopleRowProps = {
  people: readonly string[];
  /** Show the My projects chip. */
  mine: boolean;
  who: string | undefined;
  /** The new pick, or undefined when the picked one is tapped again. */
  onPick: (who: string | undefined) => void;
};

/** "Show projects of": the chip and the teammates' avatars, each a toggle button. */
export function PeopleRow({ people, mine, who, onPick }: PeopleRowProps) {
  const toggle = (w: string) => onPick(who === w ? undefined : w);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="toolbar"
      accessibilityLabel={LIST.people}
      testID="project-people"
      contentContainerClassName="items-center"
    >
      {mine && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={LIST.myProjects}
          accessibilityState={{ selected: who === WHO_ME }}
          onPress={() => toggle(WHO_ME)}
          className={`mr-1 min-h-11 justify-center rounded-full px-4 ${who === WHO_ME ? 'bg-accent' : 'bg-muted'}`}
        >
          <Text
            className={`text-subhead font-medium ${who === WHO_ME ? 'text-accent-foreground' : 'text-foreground'}`}
          >
            {LIST.myProjects}
          </Text>
        </Pressable>
      )}
      {people.map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={n}
          accessibilityHint={person(n)?.full}
          accessibilityState={{ selected: who === n }}
          onPress={() => toggle(n)}
          className={`h-12 w-12 items-center justify-center rounded-full ${who === n ? 'border-2 border-atlas' : ''}`}
        >
          <PersonAvatar name={n} size="md" />
        </Pressable>
      ))}
    </ScrollView>
  );
}
