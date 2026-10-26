/**
 * The session: Better Auth's Expo client, talking to the same `/api/auth/*` the web uses.
 *
 * The session cookie lives in SecureStore (the Expo plugin writes it on every auth response and
 * replays it on the next one). `@better-auth/expo` on the server side trusts the `simplepm://`
 * scheme and turns the `expo-origin` header into `origin`, so React Native passes the origin
 * check without CORS — see server/mobile-origins.ts.
 *
 * The client is built on first use, not at import time: `apiBaseUrl()` throws when
 * EXPO_PUBLIC_API_URL is unset, and a module-level call would turn that into a blank screen
 * instead of a message. No screen uses this yet; wiring sign-in up is Phase 2 step 2.
 */
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { apiBaseUrl, setAuthHeaders } from './client';

/** Deep-link scheme; must match `scheme` in app.config.ts and MOBILE_APP_ORIGIN on the server. */
export const APP_SCHEME = 'simplepm';

/** Prefix for the SecureStore keys holding the cookie and the cached session. */
export const SESSION_STORAGE_PREFIX = 'simplepm';

export type AuthClient = ReturnType<typeof createClient>;

function createClient() {
  return createAuthClient({
    baseURL: apiBaseUrl(),
    plugins: [
      expoClient({
        scheme: APP_SCHEME,
        storagePrefix: SESSION_STORAGE_PREFIX,
        storage: SecureStore,
      }),
    ],
  });
}

let client: AuthClient | null = null;

/**
 * The app's single auth client. Memoised because `useSession` subscribes to the client's own
 * store: a second instance would keep its own copy and the two would drift apart.
 */
export function getAuthClient(): AuthClient {
  if (!client) client = createClient();
  return client;
}

/** Drops the memoised client, so the next call rebuilds it (tests, or a changed base URL). */
export function resetAuthClient(): void {
  client = null;
}

/**
 * Headers that carry the stored session to our own endpoints. React Native has no cookie jar,
 * so `/api/app/*` requests have to send the cookie the auth client saved.
 */
export async function sessionHeaders(): Promise<Record<string, string>> {
  const cookie = await getAuthClient().getCookie();
  return cookie ? { cookie } : {};
}

/**
 * Points the API client at the stored session. Call once while the app starts; after that every
 * `apiGet`/`apiPost` is made as the signed-in user.
 */
export function connectSessionToApi(): void {
  setAuthHeaders(sessionHeaders);
}
