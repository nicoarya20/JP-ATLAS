// Stand-ins for the three native modules Better Auth's Expo client needs (src/api/auth.ts), wired
// up globally in jest.setup.js: from Phase 2 on, every test that renders the root layout loads that
// client, and none of the three has an implementation in jest.
//
// Use as `jest.mock('expo-secure-store', () => require('./__tests__/helpers/expo-session-mocks').secureStoreMock())`.

/** In-memory SecureStore. `__store` is the map itself, for a test that wants to look inside. */
export function secureStoreMock() {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: (key: string) => store.get(key) ?? null,
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    setItemAsync: async (key: string, value: string) => void store.set(key, value),
    deleteItemAsync: async (key: string) => void store.delete(key),
  };
}

/**
 * The deep-link origin the plugin puts in `expo-origin`; the real `createURL` wants an Expo
 * manifest. Only those two functions are replaced — expo-router imports the rest of this module
 * (`unwrapDevLaunchURL` and friends) and a wholesale mock takes the router's linking apart.
 */
export function linkingMock() {
  return {
    ...jest.requireActual<Record<string, unknown>>('expo-linking'),
    createURL: (path: string) => `simplepm://${path.replace(/^\//, '')}`,
    parse: (url: string) => ({ path: url, queryParams: {} }),
  };
}

/** The plugin's online manager subscribes to this; a live listener would outlast the test. */
export function networkMock() {
  return {
    addNetworkStateListener: () => ({ remove: () => {} }),
    getNetworkStateAsync: async () => ({ isInternetReachable: true }),
  };
}
