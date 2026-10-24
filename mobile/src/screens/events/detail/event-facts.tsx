// Time, location, project (a link to the project), repeat and reminder of an event (prototype events.detail.jsx Facts).
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Facts } from '@/components/list/facts';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import {
  DEFAULT_PROJECT,
  type EventItem,
  eventDate,
  eventWhere,
  REPEATS,
} from '@/data/events.shared';
import { routeHref } from '@/navigation/route-href';

import { DETAIL } from '../events.strings';

type EventFactsProps = { event: EventItem; project: string };

/** Label–value rows; the project opens its overview. */
export function EventFacts({ event: e, project }: EventFactsProps) {
  const repeat = REPEATS.find(([, v]) => v === (e.repeat ?? ''))?.[0] ?? e.repeat;
  const link = (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={project}
      onPress={() => router.push(routeHref(`/projects/${e.project ?? DEFAULT_PROJECT}`))}
      className="min-h-11 flex-row items-center gap-1 data-[active=true]:opacity-70"
    >
      <Text className="text-subhead font-semibold text-atlas">{project}</Text>
      <Icon as={ChevronRight} size="sm" className="text-atlas" />
    </Pressable>
  );
  return (
    <Facts
      testID="event-facts"
      facts={[
        [DETAIL.time, `${eventDate(e)} · ${e.range}`],
        [DETAIL.location, eventWhere(e)],
        [DETAIL.project, link],
        [DETAIL.repeat, repeat],
        [DETAIL.reminder, DETAIL.reminderValue],
      ]}
    />
  );
}
