// Expo transpiles this file but not what it imports; tsx's require hook lets it read the TypeScript token file
// (docs.expo.dev/guides/typescript). Must stay the first import.
import 'tsx/cjs';

import type { ExpoConfig } from 'expo/config';

// Relative path: Expo evaluates this file in Node, where the `@/` alias does not exist.
import pkg from './package.json';
import { DARK, LIGHT } from './src/theme/tokens';

/** Expo app config. Splash and adaptive-icon colours come from the JP Atlas tokens; the icon images are still the
 *  template's until Phase 3. */
const config: ExpoConfig = {
  name: 'Simple PM',
  slug: 'simple-pm',
  // The app version lives only in package.json.
  version: pkg.version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'simplepm',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: LIGHT.canvas,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: LIGHT.canvas,
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: DARK.canvas },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
