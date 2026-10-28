// The React Compiler (app.config.ts `reactCompiler`) only treats a call as a hook when its name is `use` + a capital
// (`useFoo()` or `obj.useFoo()`). A hook behind any other name, like the old `resource.use()`, is compiled as plain
// code and cached after the first render: the hooks inside are skipped from then on, React reports a change in the
// order of Hooks, and the screen stops following its data. Jest does not run the compiler, so screen tests cannot
// see this; this file compiles the real sources the way Metro does.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { transformSync } from '@babel/core';

const SRC = join(__dirname, '../../src');

/** Compile one source with only TypeScript stripping and the React Compiler, like the device bundle. */
function compile(code: string, filename: string): string {
  const out = transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
    plugins: ['babel-plugin-react-compiler', '@babel/plugin-syntax-jsx'],
  });
  return out?.code ?? '';
}

/** A call the compiler put inside its run-once branch, so it only happens on the first render. */
const cachedCall = (member: string) =>
  new RegExp(
    String.raw`if \(\$\[\d+\] === Symbol\.for\("react\.memo_cache_sentinel"\)\) \{\s*(?:(?:const|let) )?(?:\w+ = )?[\w.]+\.${member}\(\)`,
  );

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const readers = sources(SRC).filter((f) => readFileSync(f, 'utf8').includes('.useSnapshot()'));

test('the detector catches a hook behind a non-hook name', () => {
  const code = `
    import { r } from './r';
    export function Screen() { const s = r.use(); return <Text>{s.phase}</Text>; }
  `;
  expect(compile(code, 'screen.tsx')).toMatch(cachedCall('use'));
});

test('no source calls a resource through the old `.use()` name', () => {
  const offenders = sources(SRC).filter((f) => /[\w)\]]\.use\(\)/.test(readFileSync(f, 'utf8')));
  expect(offenders).toEqual([]);
});

test('some sources read a resource', () => {
  expect(readers.length).toBeGreaterThan(10);
});

test.each(readers.map((f) => [f.slice(SRC.length + 1), f]))(
  '%s calls useSnapshot() on every render',
  (_name, file) => {
    expect(compile(readFileSync(file, 'utf8'), file)).not.toMatch(cachedCall('useSnapshot'));
  },
);
