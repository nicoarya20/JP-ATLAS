// Time, location, meeting link, project and reminder of an event (prototype events.detail.jsx
// Facts). The project opens its overview; a personal event has no project to open (B4), and the
// Repeat row is gone with recurrence (GAP-A4).
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Facts } from '@/components/list/facts';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { remindersLabel, type ServerEventDetail } from '@/data/events.map';
import { eventDate } from '@/data/events.shared';

import { DETAIL } from '../events.strings';

type EventFactsProps = { event: ServerEventDetail; project: string | null };

/** Label–value rows; the project opens its overview. */
export function EventFacts({ event: e, project }: EventFactsProps) {
  const link =
    project && e.project ? (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={project}
        onPress={() => router.push(`/projects/${e.project}`)}
        className="min-h-11 flex-row items-center gap-1 data-[active=true]:opacity-70"
      >
        <Text className="text-subhead font-semibold text-atlas">{project}</Text>
        <Icon as={ChevronRight} size="sm" className="text-atlas" />
      </Pressable>
    ) : (
      DETAIL.personal
    );
  return (
    <Facts
      testID="event-facts"
      facts={[
        [DETAIL.time, `${eventDate(e)} · ${e.range}`],
        [DETAIL.location, e.place || e.mode],
        // Only an online meeting has one, and it is its own row so it can be read and copied (B3).
        [DETAIL.link, e.meetingUrl ?? undefined],
        [DETAIL.project, link],
        [DETAIL.reminder, remindersLabel(e.remindersMinutes)],
      ]}
    />
  );
}
