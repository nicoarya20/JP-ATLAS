// Rewrites global.css from src/theme/*.ts (JP Atlas tokens). Run from mobile/: `bun run theme:css`.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGlobalCss } from '../src/theme/theme-css';

const target = join(import.meta.dirname, '..', 'global.css');
writeFileSync(target, buildGlobalCss());
console.info(`Wrote ${target}`);
