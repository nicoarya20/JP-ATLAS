// Jest allows one resolver, and two are needed: jest-expo's (the React Native preset one, which lets tests reach
// react-native subpaths) and Reanimated 4's, which sends Reanimated and Worklets to their web implementations because
// jest has no native worklets runtime (docs.swmansion.com/react-native-reanimated/docs/guides/testing). Reanimated's
// resolver ends in `options.defaultResolver`; it is handed the React Native one, so both apply.
const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');
const reanimatedResolver = require('react-native-reanimated/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) =>
  reanimatedResolver(request, {
    ...options,
    defaultResolver: (req, opts) =>
      reactNativeResolver(req, { ...opts, defaultResolver: options.defaultResolver }),
  });
