// Sample data of the prototype (Nico's world), re-exported for the data layer. Screens read src/data/home.ts instead.
export * from './admin';
export * from './archive';
export * from './events';
export * from './home';
export * from './inbox';
export * from './people';
export * from './people.extra';
export * from './projects';
export * from './tasks';
// Only the greeting: TODAY is the sample's own day and test-only now, so it is not re-exported
// here — every date in the app comes from the server's clock (src/data/clock.ts, K1).
export { GREETING } from './today';
