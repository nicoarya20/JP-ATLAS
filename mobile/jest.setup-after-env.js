// Runs once the test framework is in place: importing RNTL here (not in jest.setup.js, a setupFiles entry) keeps its
// automatic afterEach cleanup, which it only registers when afterEach exists.

// MITIGASI SEMENTARA (see jest.config.js): findBy*/waitFor give up after 1 s by default, which a busy machine can miss
// for a navigation that takes a fraction of that at normal load. Remove with the jest.config.js settings.
const ASYNC_UTIL_TIMEOUT_MS = 3000;
require('@testing-library/react-native').configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });
