/**
 * The Better Auth Expo client: built lazily from EXPO_PUBLIC_API_URL, stored in SecureStore, and
 * able to hand the stored cookie to the API client so `/api/app/*` requests are signed in.
 */
import {
  APP_SCHEME,
  ApiError,
  apiGet,
  CLIENT_CODES,
  connectSessionToApi,
  getAuthClient,
  isApiError,
  resetAuthClient,
  SESSION_STORAGE_PREFIX,
  sessionHeaders,
  setAuthHeaders,
} from '@/api';

/** nanostores' STORE_UNMOUNT_DELAY; not imported, because nanostores is better-auth's dep, not ours. */
const STORE_UNMOUNT_DELAY_MS = 1000;

const BASE = 'http://192.168.1.10:3005';
const COOKIE = 'better-auth.session_token=abc123';
/** What the Expo plugin actually writes under `<prefix>_cookie`: a name -> {value, expires} map. */
const STORED_COOKIE = JSON.stringify({
  'better-auth.session_token': { value: 'abc123', expires: null },
});

// The Expo plugin builds the deep-link origin with Linking.createURL, which wants a real
// expo-constants manifest; and its online manager subscribes to expo-network, which would leave
// a listener open after the test. Neither is what these tests are about.
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `simplepm://${path.replace(/^\//, '')}`,
  parse: (url: string) => ({ path: url, queryParams: {} }),
}));

jest.mock('expo-network', () => ({
  addNetworkStateListener: () => ({ remove: () => {} }),
  getNetworkStateAsync: async () => ({ isInternetReachable: true }),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: (key: string) => store.get(key) ?? null,
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    setItemAsync: async (key: string, value: string) => void store.set(key, value),
    deleteItemAsync: async (key: string) => void store.delete(key),
  };
});

const secureStore = jest.requireMock('expo-secure-store') as { __store: Map<string, string> };

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  secureStore.__store.clear();
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

afterAll(async () => {
  // Better Auth's session store is a nanostore, and nanostores wait STORE_UNMOUNT_DELAY before
  // tearing a store down. Give that timer room to fire, or Jest reports a leaked handle.
  resetAuthClient();
  await new Promise((resolve) => setTimeout(resolve, STORE_UNMOUNT_DELAY_MS + 100));
});

describe('the auth client', () => {
  it('calls the server EXPO_PUBLIC_API_URL points at', async () => {
    let called = '';
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      // better-fetch may hand fetch a string, a URL or a Request; only the href matters here.
      called = typeof input === 'string' ? input : 'url' in input ? input.url : String(input);
      return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;

    await getAuthClient().getSession();
    expect(called.startsWith(`${BASE}/api/auth/`)).toBe(true);
  });

  it('is the same instance on every call, so useSession sees one store', () => {
    expect(getAuthClient()).toBe(getAuthClient());
  });

  it('is rebuilt after a reset', () => {
    const first = getAuthClient();
    resetAuthClient();
    expect(getAuthClient()).not.toBe(first);
  });

  it('is not built at import time, so a missing base URL is a message not a crash', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    resetAuthClient();
    expect(() => getAuthClient()).toThrow(ApiError);
    const err = await sessionHeaders().catch((e: unknown) => e);
    expect(isApiError(err) && err.code).toBe(CLIENT_CODES.NO_BASE_URL);
  });

  it('exposes the sign-in surface Phase 2 needs', () => {
    const client = getAuthClient();
    expect(typeof client.signIn.email).toBe('function');
    expect(typeof client.signIn.social).toBe('function');
    expect(typeof client.signOut).toBe('function');
    expect(typeof client.getSession).toBe('function');
    expect(typeof client.useSession).toBe('function');
    expect(typeof client.getCookie).toBe('function');
  });

  it('uses the app scheme the server trusts', () => {
    expect(APP_SCHEME).toBe('simplepm');
    expect(SESSION_STORAGE_PREFIX).toBe('simplepm');
  });
});

describe('the stored session reaches our own endpoints', () => {
  it('sends no cookie header while nothing is stored', async () => {
    await expect(sessionHeaders()).resolves.toEqual({});
  });

  it('reads the cookie the Expo plugin stored in SecureStore', async () => {
    secureStore.__store.set(`${SESSION_STORAGE_PREFIX}_cookie`, STORED_COOKIE);
    await expect(sessionHeaders()).resolves.toEqual({ cookie: COOKIE });
  });

  it('puts that cookie on an API request once connected', async () => {
    secureStore.__store.set(`${SESSION_STORAGE_PREFIX}_cookie`, STORED_COOKIE);
    let sent: Record<string, string> = {};
    globalThis.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      sent = init.headers as Record<string, string>;
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;

    connectSessionToApi();
    await apiGet('/api/app/home');
    expect(sent.cookie).toBe(COOKIE);
  });
});
