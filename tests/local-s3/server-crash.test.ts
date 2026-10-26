/** RustFS dying during start must fail fast, not wait out the readiness timeout (fake runtime, no download). */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { boot } from '../../server/local-s3/server';

const PORT = 54436; // test-only
const TIMEOUT_MS = 20_000; // far above the expected failure time, so passing proves no wait
const FAIL_FAST_MS = 5_000;

let root: string;

/** Runtime dir whose `rustfs` runs `body` (sh), marked installed like `ensureS3Runtime` does. */
async function fakeRuntime(body: string): Promise<string> {
  const runtime = path.join(root, 'runtime');
  await fs.mkdir(runtime, { recursive: true });
  await fs.writeFile(path.join(runtime, 'rustfs'), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  await fs.writeFile(path.join(runtime, '.ok'), 'test\n'); // test-only marker
  return runtime;
}

describe('local RustFS crash on start', () => {
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-s3-crash-'));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it.each([
    // dyld aborting on a missing dylib: killed by a signal, exitCode stays null.
    [
      'signal',
      'echo "dyld: Library not loaded: liblzma.5.dylib" >&2; kill -ABRT $$',
      /\(SIGABRT\)/,
      /dyld: Library not loaded/,
    ],
    ['exit code', 'echo "Volume not found" >&2; exit 3', /\(exit 3\)/, /Volume not found/],
  ])('rejects quickly with the reason when RustFS dies by %s', async (_, body, how, reason) => {
    const runtime = await fakeRuntime(body);
    const dir = path.join(root, 'data');
    const started = Date.now();
    const err = await boot({ dir, runtime, port: PORT, timeoutMs: TIMEOUT_MS }).catch((e) => e);
    expect(Date.now() - started).toBeLessThan(FAIL_FAST_MS);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/RustFS berhenti saat start/);
    expect(err.message).toMatch(how);
    expect(err.message).toMatch(reason);
    expect(await Bun.file(path.join(dir, 'rustfs.pid')).exists()).toBe(false);
  });
});
