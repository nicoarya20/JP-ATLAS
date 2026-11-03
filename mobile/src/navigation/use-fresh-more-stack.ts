// More has no screen of its own, so its stack has no root to pop back to: popToTopOnBlur leaves the first More screen
// opened (Edit profile from the profile modal, Team from the panel) at the bottom, and the next More screen was pushed
// on top of it, where Back from that screen returned to it. A screen opened from another tab therefore becomes the only
// one in the stack, the way every other tab starts from its root.
import {
  CommonActions,
  type EventListenerCallback,
  type StackNavigationState,
  useNavigationState,
} from 'expo-router/react-navigation';
import { useEffect, useRef } from 'react';

import { MORE_ID, TABS } from './tabs.config';

const MORE_ROUTE = TABS.find((t) => t.id === MORE_ID)?.route;

type StackState = StackNavigationState<Record<string, object | undefined>>;
type Listeners = {
  state: EventListenerCallback<{ state: { data: { state: StackState } } }, 'state'>;
};

/** Screen listeners for the More stack: the first change after a switch from another tab keeps only the top screen. */
export function useFreshMoreStack(): (p: {
  navigation: { dispatch: (a: CommonActions.Action) => void };
}) => Listeners {
  // The tab navigator's focused tab; a modal over the tabs (the profile) leaves it on More.
  const focused = useNavigationState((s) => s.routes[s.index]?.name);
  // True from leaving More until the switch back has been seen. The stack's own state event comes before this
  // layout's effect (a child's effects run first), so the push that opens a screen still finds it true; the tab's
  // nested state read from here would lag behind.
  const away = useRef(false);
  useEffect(() => {
    away.current = focused !== MORE_ROUTE;
  }, [focused]);
  return ({ navigation }) => ({
    state: (e) => {
      const { routes } = e.data.state;
      const top = routes[routes.length - 1];
      if (!away.current || routes.length < 2 || !top) return;
      away.current = false;
      navigation.dispatch(CommonActions.reset({ ...e.data.state, index: 0, routes: [top] }));
    },
  });
}
