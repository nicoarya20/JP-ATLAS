// jest-expo's default ignore list, plus the ESM-only packages gluestack-ui components import
// (they must go through babel-jest like the Expo packages do).
const ESM_PACKAGES = [
  '.pnpm',
  // Better Auth ships ESM only, and so do the packages it re-exports from (src/api/auth.ts).
  'better-auth',
  '@better-auth',
  '@better-fetch',
  'better-call',
  'nanostores',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
  '@gluestack-ui',
  '@legendapp',
  'tailwind-variants',
  'uniwind',
];

/*
 * MITIGASI SEMENTARA (flaky tests under load; diagnosis 2026-10-25, H1 report). Symptom: router and animation tests fail
 * at random when the machine is busy (several sessions running suites, load avg 25-32 on 8 cores) and pass alone.
 * Of 145 failures in two parallel full runs, 136 were "Exceeded timeout of 5000 ms", 7 were findBy/waitFor's 1 s
 * timeout and 2 were knock-ons of a timed-out test whose body kept running into the next one. No failure repeated
 * across runs, and a single run of the router-heavy folders passed (368/368 at load 28, slowest test 2.8 s). Cause:
 * CPU oversubscription (each run defaults to cores - 1 workers, so concurrent runs put 14-21 workers on 8 cores), not
 * a test or app bug. These settings only make room for it: fewer workers per run, and wall-clock budgets with headroom
 * (RNTL's asyncUtilTimeout is in jest.setup-after-env.js). Remove them once suites no longer run concurrently on one
 * machine (e.g. a single CI run), and look into any test that still nears the default 5 s on its own.
 */
const MAX_WORKERS = '50%';
const TEST_TIMEOUT_MS = 15000;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  maxWorkers: MAX_WORKERS,
  testTimeout: TEST_TIMEOUT_MS,
  resolver: '<rootDir>/jest.resolver.js',
  // jest-expo transforms only `.js`/`.ts(x)`; Better Auth also ships `.mjs` files (e.g.
  // @better-auth/core/dist/utils/json.mjs), which Jest would otherwise require as CommonJS.
  transform: { '\\.mjs$': 'babel-jest' },
  // Gesture Handler's official mocks (native module, buttons, v3 gesture detector), then ours.
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/jest.setup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.js'],
  // Shared test helpers live next to the tests but are not test files themselves.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/helpers/'],
  transformIgnorePatterns: [
    `/node_modules/(?!(${ESM_PACKAGES.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
