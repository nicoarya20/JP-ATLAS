import { useLocalSearchParams } from 'expo-router';

import { PersonScreen } from '@/screens/team/person.screen';

/** Team › person, by key (e.g. /more/team/rina). */
export default function TeamPersonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PersonScreen id={id} />;
}
