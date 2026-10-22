// Test helper: the theme layer's CSS text. library.css only @imports its part files (library.*.css), so tests that
// look for a rule read the parts, joined in the order library.css loads them.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(__dirname, '..', 'styles');

/** File names library.css imports, in load order. */
export const libraryParts = () => [...readFileSync(join(STYLES, 'library.css'), 'utf8').matchAll(/@import '\.\/([^']+)'/g)]
  .map(m => m[1]);

/** Every theme-layer rule as one CSS string. */
export const readLibrary = () => libraryParts().map(f => readFileSync(join(STYLES, f), 'utf8')).join('\n');
