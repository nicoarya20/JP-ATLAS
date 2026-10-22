import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Glob } from 'bun';

// The UI reads `can`/`appCaps` from the server and never compares a role itself (R03 §3.7, X3 M29),
// otherwise a button and the API that guards it drift apart.
const ROOT = path.join(import.meta.dir, '..');
const SCAN_GLOBS = [
  'app/routes/app/**/*.{ts,tsx}',
  'app/components/{ui,pm,projects,tasks}/**/*.{ts,tsx}',
];
// Pure display maps keyed by role (a lookup, not a decision). A line naming one is skipped.
const DISPLAY_MAPS = /\b(?:ROLE_SHORT|BADGE_COLOR)\b/;

const ROLE_NAME = String.raw`[\w$.]*[rR]ole\b`; // role, appRole, user.role, membership.role, projectRole
const COMPARISONS: ReadonlyArray<[RegExp, string]> = [
  [new RegExp(String.raw`\b${ROLE_NAME}\s*[!=]==?`), 'compares a role'],
  [new RegExp(String.raw`[!=]==?\s*${ROLE_NAME}`), 'compares a role'],
  [new RegExp(String.raw`\bswitch\s*\(\s*${ROLE_NAME}`), 'switches on a role'],
  [new RegExp(String.raw`\.includes\(\s*${ROLE_NAME}\s*\)`), 'tests a role against a list'],
];

// Comments are dropped first so a note like "was role === 'admin'" does not count; `//` must follow
// whitespace so it is not taken from a URL inside a string.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/(^|\s)\/\/.*$/gm, '$1');

/** Lines of `src` that branch on a role, as `line: reason`. */
function roleBranching(src: string): string[] {
  return stripComments(src)
    .split('\n')
    .flatMap((text, i) => {
      if (DISPLAY_MAPS.test(text)) return [];
      const hit = COMPARISONS.find(([re]) => re.test(text));
      return hit ? [`${i + 1}: ${hit[1]}: ${text.trim()}`] : [];
    });
}

describe('role-branching scanner', () => {
  it.each([
    ['strict equality', "if (role === 'admin') return null;"],
    ['app role', 'const isPm = appRole === ROLES.PROJECT_MANAGER;'],
    ['inequality', "if (appRole !== 'member') show();"],
    ['loose equality', 'if (user.role == "admin") show();'],
    ['project role in JSX', "{membership.role === 'manager' && <Button>Hapus</Button>}"],
    ['literal on the left', "const ok = 'admin' === data.role;"],
    ['switch', 'switch (role) {'],
    ['list membership', "const ok = ['admin', 'super-admin'].includes(role);"],
    ['after a comment line', "// fine\nif (role === 'x') y();"],
    ['block comment before code', "/* note */ if (role === 'x') y();"],
  ])('flags %s', (_name, snippet) => {
    expect(roleBranching(snippet)).not.toEqual([]);
  });

  it.each([
    ['server capability', 'if (!can.update) return null;'],
    ['app capability', '{appCaps.dashboard && <NavLink />}'],
    ['display map lookup', 'const label = ROLE_SHORT[role] ?? role;'],
    [
      'display map definition',
      "const BADGE_COLOR = { admin: 'red', member: role === 'x' ? 'a' : 'b' };",
    ],
    ['ARIA role attribute', '<div role="button" tabIndex={0} />'],
    ['role passed along', 'return <Badge color={BADGE_COLOR[data.role] ?? "gray"} />;'],
    ['line comment', "// used to be role === 'admin'"],
    ['block comment', "/*\n * appRole === 'admin' was removed\n */\nconst x = 1;"],
    ['URL in a string', "const u = 'https://example.com/role';"],
    ['unrelated words', "const prole = 1; if (enrollment === 'x') y();"],
  ])('allows %s', (_name, snippet) => {
    expect(roleBranching(snippet)).toEqual([]);
  });

  it('reports the line number of the offence', () => {
    expect(roleBranching("const a = 1;\nif (role === 'x') y();")[0]).toStartWith('2:');
  });
});

describe('repository', () => {
  const files = SCAN_GLOBS.flatMap((g) => [...new Glob(g).scanSync(ROOT)]).sort();

  it('scans the /app routes, so an empty glob cannot make the check pass', () => {
    expect(files).toContain('app/routes/app/layout.tsx');
  });

  it('has no role comparison in /app routes or the shared UI components', () => {
    const offences = files.flatMap((f) =>
      roleBranching(readFileSync(path.join(ROOT, f), 'utf8')).map((o) => `${f}:${o}`),
    );
    expect(offences).toEqual([]);
  });
});
