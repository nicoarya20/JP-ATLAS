// First, like app/_layout.tsx: the Atlas tailwind-merge config must be on before any component's tva is defined
// (__tests__/theme/tw-merge.button.test.tsx fails without it).
require('@/theme/tw-merge');

// react-aria (pulled in by gluestack-ui) polyfills window.screen.orientation when NODE_ENV=test and calls
// Reflect.has(window.screen, …) at import time. The React Native jest environment defines `window` but not
// `window.screen`, so that call throws. Give it the empty object a browser would have. Remove when react-aria
// guards the polyfill itself.
if (typeof window !== 'undefined' && window.screen === undefined) {
  Object.defineProperty(window, 'screen', { value: {}, configurable: true, writable: true });
}

// lucide-react-native's "react-native" export is an .mjs file, which jest-expo's transform (\.[jt]sx?$) skips, so
// listing it in ESM_PACKAGES is not enough. Tests load the package's own CommonJS build instead (same icons).
jest.mock('lucide-react-native', () =>
  require(
    require('node:path').join(
      __dirname,
      'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    ),
  ),
);

// Reanimated 4's jest setup (with its resolver in jest.resolver.js): animations run on the JS thread in tests.
require('react-native-reanimated').setUpTests();

// Without native inset events a SafeAreaProvider renders nothing, and the gluestack toast list wraps each toast in one.
// The library's own jest mock provides fixed metrics.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// app/_layout.tsx imports the Tailwind entry for Uniwind (Metro compiles it); jest cannot parse CSS and the tests do not
// need it: class names resolve through Uniwind's runtime, not this file.
jest.mock('./global.css', () => ({}));

// Gesture Handler hands Worklets' UI runtime to its native module once loaded (its jest utils load the lib/module build). The
// resolver above gives Worklets its web build, whose getUIRuntimeHolder throws, so use Gesture Handler's web variant
// of that step too: a no-op, as there is no UI runtime in jest.
jest.mock(
  require('node:path').join(
    __dirname,
    'node_modules/react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  ),
  () =>
    require(
      require('node:path').join(
        __dirname,
        'node_modules/react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings.web',
      ),
    ),
);

// The session (src/api/auth.ts) is Better Auth's Expo client, and the gate in app/_layout.tsx loads it for every test that
// renders the root layout. Its three native dependencies have no implementation in jest: SecureStore becomes an
// in-memory map, and Linking/Network return the two values the plugin reads. Factories live in
// __tests__/helpers/expo-session-mocks.ts; a suite that wants to look inside the store reads it with jest.requireMock.
jest.mock('expo-secure-store', () =>
  require('./__tests__/helpers/expo-session-mocks').secureStoreMock(),
);
jest.mock('expo-linking', () => require('./__tests__/helpers/expo-session-mocks').linkingMock());
jest.mock('expo-network', () => require('./__tests__/helpers/expo-session-mocks').networkMock());

// The API client refuses to run without a server address (src/api/client.ts), on purpose: a silent default would send a
// real session somewhere unexpected. Tests get one and never reach it — fetch is always stubbed. test-only
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3005';
