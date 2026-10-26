import { useLocalSearchParams } from 'expo-router';

import { DeleteScreen } from '@/screens/archive/delete.screen';

/** Archive › Delete forever sheet for one entry. */
export default function ArchiveDeleteRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  return <DeleteScreen entryKey={key} />;
}
