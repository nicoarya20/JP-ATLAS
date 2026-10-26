// Runs once the test framework is in place: importing RNTL here (not in jest.setup.js, a setupFiles entry) keeps its
// automatic afterEach cleanup, which it only registers when afterEach exists.

// MITIGASI SEMENTARA (see jest.config.js): findBy*/waitFor give up after 1 s by default, which a busy machine can miss
// for a navigation that takes a fraction of that at normal load. Remove with the jest.config.js settings.
const ASYNC_UTIL_TIMEOUT_MS = 3000;
require('@testing-library/react-native').configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });

// Phase 2 gates the app on a session (app/_layout.tsx). A test that is not about signing in starts from an approved
// account already read, so the gate renders the app on the first frame and asks the server nothing; a test about the
// gate resets the store itself and lets the real read run against a stubbed fetch.
// Phase 2 also takes today's date from the server (K1), so the clock is seeded with the sample's own day
// (helpers/session-fixtures.ts). Seeded twice on purpose: once now, because a suite may build its expected data in a
// `describe` body, which runs before any `beforeEach`; and again per test, to undo what a test changed.
const session = require('./__tests__/helpers/session-fixtures');
session.seedSession();
beforeEach(() => {
  session.resetSessionForTest();
  session.seedSession();
});
