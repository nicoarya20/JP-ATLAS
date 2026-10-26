import { useSegments } from 'expo-router';
import { useState } from 'react';

import { tabBarVisibleFor } from '@/navigation/tab-bar.visibility';

/** Whether the tab bar shows for the current route; a root sheet or modal over the tabs keeps the last answer. */
export function useTabBarVisible(): boolean {
  const visible = tabBarVisibleFor(useSegments());
  const [last, setLast] = useState(true);
  if (visible !== null && visible !== last) setLast(visible);
  return visible ?? last;
}
