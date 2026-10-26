// expo-router stand-in for screen tests that render a screen alone (no Stack): every router call is a jest.fn, params
// come from setParams(), and <Redirect> renders its target so a test can see where it went. Use as
// `jest.mock('expo-router', () => require('../helpers/router-mock').routerMock())`.
import { Text } from 'react-native';

let params: Record<string, string> = {};

/** The params useLocalSearchParams returns until the next call. test-only */
export const setParams = (p: Record<string, string>) => {
  params = p;
};

/** Module factory for jest.mock('expo-router'). */
export function routerMock() {
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      back: jest.fn(),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
      canDismiss: jest.fn(() => false),
      canGoBack: jest.fn(() => true),
      setParams: jest.fn(),
    },
    useLocalSearchParams: () => params,
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
  };
}
