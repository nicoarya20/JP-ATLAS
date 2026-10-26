// Sample data of the prototype (Nico's world), re-exported for the data layer. Screens read src/data/home.ts instead.
export * from './admin';
export * from './archive';
export * from './events';
export * from './people';
export * from './people.extra';
export * from './projects';
export * from './tasks';
// Nothing of './today' is re-exported: TODAY is the sample's own day and test-only now, and the
// greeting comes from the server's `now.greeting` — every date in the app comes from the server's
// clock (src/data/clock.ts, K1).
