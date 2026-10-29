/**
 * Web trusted hosts for Better Auth's dynamic baseURL: the pure host-list builder, the list the
 * running instance exposes, and proof that login is trusted from localhost on any port and from the
 * canonical domain while a foreign host is refused — the whole point of making baseURL per-request.
 */
import { describe, expect, test } from 'bun:test';
import { auth } from '../server/auth';
import { env, webAllowedHosts } from '../server/env';
import {
  buildWebAllowedHosts,
  hostOfUrl,
  isLoopbackHostPort,
  LOCAL_HOST_PATTERNS,
} from '../server/web-origins';

describe('buildWebAllowedHosts', () => {
  test('always includes the loopback wildcards, any port', () => {
    const hosts = buildWebAllowedHosts([]);
    for (const p of LOCAL_HOST_PATTERNS) expect(hosts).toContain(p);
  });

  test('adds the canonical public host from a URL, without scheme or trailing slash', () => {
    const hosts = buildWebAllowedHosts(['https://simple-pm.wibudev.com/']);
    expect(hosts).toContain('simple-pm.wibudev.com');
  });

  test('drops hosts already covered by the loopback wildcards', () => {
    const hosts = buildWebAllowedHosts(['http://localhost:3005', 'http://127.0.0.1:4007']);
    // No bare localhost:3005 / 127.0.0.1:4007 entries — the wildcards already match them.
    expect(hosts.filter((h) => !LOCAL_HOST_PATTERNS.includes(h))).toEqual([]);
  });

  test('de-duplicates and ignores empty / unparseable values', () => {
    const hosts = buildWebAllowedHosts([
      'https://app.example.com',
      'https://app.example.com',
      '',
      null,
      undefined,
      'not a url',
    ]);
    expect(hosts.filter((h) => h === 'app.example.com')).toEqual(['app.example.com']);
  });
});

describe('hostOfUrl / isLoopbackHostPort', () => {
  test('hostOfUrl returns host:port lower-cased, null on garbage', () => {
    expect(hostOfUrl('https://Simple-PM.Wibudev.com')).toBe('simple-pm.wibudev.com');
    expect(hostOfUrl('http://localhost:4007')).toBe('localhost:4007');
    expect(hostOfUrl('')).toBeNull();
    expect(hostOfUrl('nope')).toBeNull();
  });

  test('isLoopbackHostPort recognises loopback forms (as URL.host produces them)', () => {
    for (const h of ['localhost:3005', '127.0.0.1:4007', '[::1]:4007', '[::1]', 'api.localhost'])
      expect(isLoopbackHostPort(h)).toBe(true);
    for (const h of ['simple-pm.wibudev.com', 'example.com:8080'])
      expect(isLoopbackHostPort(h)).toBe(false);
  });
});

describe('Better Auth web origin trust (dynamic baseURL)', () => {
  const trusts = async (url: string) => (await auth.$context).isTrustedOrigin(url);

  test('baseURL is a dynamic config carrying the web allowed hosts', () => {
    const baseURL = auth.options.baseURL;
    expect(typeof baseURL).toBe('object');
    expect((baseURL as { allowedHosts: string[] }).allowedHosts).toEqual([...webAllowedHosts]);
    // A fallback is required so server-side calls without a request host still resolve.
    expect((baseURL as { fallback?: string }).fallback).toBe(env.BETTER_AUTH_URL);
  });

  test('proxy headers are trusted so the domain/scheme come from the reverse proxy', () => {
    expect(auth.options.advanced?.trustedProxyHeaders).toBe(true);
  });

  test('localhost is trusted on any port', async () => {
    expect(await trusts('http://localhost:3005')).toBe(true);
    expect(await trusts('http://localhost:4007')).toBe(true);
    expect(await trusts('http://127.0.0.1:9999')).toBe(true);
  });

  test('a foreign host is refused', async () => {
    expect(await trusts('https://evil.test')).toBe(false);
    expect(await trusts('http://attacker.example')).toBe(false);
  });
});
