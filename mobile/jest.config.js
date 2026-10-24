// jest-expo's default ignore list, plus the ESM-only packages gluestack-ui components import
// (they must go through babel-jest like the Expo packages do).
const ESM_PACKAGES = [
  '.pnpm',
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

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  resolver: '<rootDir>/jest.resolver.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    `/node_modules/(?!(${ESM_PACKAGES.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
