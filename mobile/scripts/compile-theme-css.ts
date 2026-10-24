import { join } from 'node:path';

import { compile } from '@tailwindcss/node';

import { buildGlobalCss } from '../src/theme/theme-css';

/*
 * Prints the CSS Tailwind builds from the theme for the class names given as arguments, with the compiler Uniwind runs
 * (@tailwindcss/node). theme-css.test.ts calls it in a child process: the compiler cannot load inside jest.
 */
const compiler = await compile(buildGlobalCss(), {
  base: join(import.meta.dirname, '..'),
  onDependency: () => {},
});
process.stdout.write(compiler.build(process.argv.slice(2)));
