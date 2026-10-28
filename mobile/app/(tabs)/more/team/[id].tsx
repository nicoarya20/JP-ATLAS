import { useLocalSearchParams } from 'expo-router';

import { PersonScreen } from '@/screens/team/person.screen';

/** Team › person, by account id (e.g. /more/team/<userId>). */
export default function TeamPersonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PersonScreen id={id} />;
}
