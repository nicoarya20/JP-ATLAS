// Time, location, the meeting link, project (a link to the project, or "Personal event") and reminder of an event
// (prototype events.detail.jsx Facts). Repeat is hidden: the server has no series yet (E-2).
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Linking } from 'react-native';

import { Facts } from '@/components/list/facts';
import { useNotice } from '@/components/notice/use-notice';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { type EventDetailView, PERSONAL } from '@/data/events.detail';

import { DETAIL } from '../events.strings';

type LinkProps = { label: string; onPress: () => void; testID?: string };

function FactLink({ label, onPress, testID }: LinkProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-11 min-w-0 flex-row items-center gap-1 data-[active=true]:opacity-70"
    >
      <Text numberOfLines={1} className="shrink text-subhead font-semibold text-atlas">
        {label}
      </Text>
      <Icon as={ChevronRight} size="sm" className="text-atlas" />
    </Pressable>
  );
}

/** Label–value rows; the project opens its overview, the meeting link opens outside the app. */
export function EventFacts({ d }: { d: EventDetailView }) {
  const notice = useNotice();
  const { project, link } = d;
  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => notice(DETAIL.linkFailed));
  };
  // Built before the list: a fact's value is a node, not an item React has to key.
  const linkFact = link && (
    <FactLink testID="event-link" label={link} onPress={() => openLink(link)} />
  );
  const projectFact = project ? (
    <FactLink
      testID="event-project"
      label={project.name}
      onPress={() => router.push(`/projects/${project.id}`)}
    />
  ) : (
    PERSONAL
  );
  return (
    <Facts
      testID="event-facts"
      facts={[
        [DETAIL.time, d.time],
        [DETAIL.location, d.where],
        [DETAIL.link, linkFact],
        [DETAIL.project, projectFact],
        [DETAIL.reminder, d.reminder],
      ]}
    />
  );
}
