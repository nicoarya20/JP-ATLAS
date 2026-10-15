/**
 * S0A-05: approval fields, email policy and account linking in `server/auth.ts`.
 * Static config assertions plus real-session proofs for C-AUTH-6 and P1 §7 #1.
 */
import { afterAll, afterEach, describe, expect, spyOn, test } from 'bun:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { api } from '../server/api';
import { auth } from '../server/auth';
import { db } from '../server/db';
import { user } from '../server/db/schema';
import { isProd } from '../server/env';

const TAG = `acfg-${crypto.randomUUID().slice(0, 8)}`;
const PASS = 'TestPass123!';
const createdEmails: string[] = [];
const createdIds: string[] = [];
const APPROVAL_FIELDS = [
  'approvalStatus',
  'approvalDecidedBy',
  'approvalDecidedAt',
  'approvalReason',
] as const;

afterEach(() => {
  // Keep a failed assertion in one test from leaving the db.insert spy installed for the next.
  spyOn(db, 'insert').mockRestore();
});

afterAll(async () => {
  if (createdEmails.length) await db.delete(user).where(inArray(user.email, createdEmails));
  if (createdIds.length) await db.delete(user).where(inArray(user.id, createdIds));
});

function post(path: string, body: unknown, cookie?: string) {
  return api.handle(
    new Request(`http://localhost/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

async function signUp(extra: Record<string, unknown> = {}) {
  const email = `${TAG}-${crypto.randomUUID().slice(0, 6)}@test.local`;
  createdEmails.push(email);
  const res = await post('/sign-up/email', {
    email,
    password: PASS,
    name: 'Config Tester',
    ...extra,
  });
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
  return { res, email, cookie };
}

async function rowFor(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  return row;
}

describe('auth options', () => {
  test('declares all four approval fields as input:false', () => {
    const fields = auth.options.user?.additionalFields ?? {};
    expect(Object.keys(fields).sort()).toEqual([...APPROVAL_FIELDS].sort());
    for (const name of APPROVAL_FIELDS) expect(fields[name]?.input).toBe(false);
  });

  test('approval status defaults to pending and is a string, decided-at is a date', () => {
    const fields = auth.options.user?.additionalFields ?? {};
    expect(fields.approvalStatus).toMatchObject({ type: 'string', defaultValue: 'pending' });
    expect(fields.approvalDecidedAt?.type).toBe('date');
  });

  test('implicit account linking is disabled', () => {
    expect(auth.options.account?.accountLinking?.disableImplicitLinking).toBe(true);
  });

  test('email+password is enabled exactly outside production', () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(!isProd);
  });
});

describe('C-AUTH-6: clients cannot write approval fields', () => {
  test('POST /update-user with approvalStatus is rejected with FIELD_NOT_ALLOWED', async () => {
    const { email, cookie } = await signUp();
    expect(cookie).toBeTruthy();
    const res = await post('/update-user', { approvalStatus: 'approved' }, cookie);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('FIELD_NOT_ALLOWED');
    expect((await rowFor(email)).approvalStatus).toBe('pending');
  });

  test.each(['approvalDecidedBy', 'approvalReason'])('rejects %s on update-user', async (field) => {
    const { email, cookie } = await signUp();
    const res = await post('/update-user', { [field]: 'forged' }, cookie);
    expect(res.status).toBe(400);
    const row = await rowFor(email);
    expect(row.approvalDecidedBy).toBeNull();
    expect(row.approvalReason).toBeNull();
  });

  test('rejects approvalDecidedAt on update-user', async () => {
    const { email, cookie } = await signUp();
    const res = await post('/update-user', { approvalDecidedAt: new Date().toISOString() }, cookie);
    expect(res.status).toBe(400);
    expect((await rowFor(email)).approvalDecidedAt).toBeNull();
  });

  test('POST /update-user with role is rejected and the role stays member', async () => {
    const { email, cookie } = await signUp();
    const res = await post('/update-user', { role: 'admin' }, cookie);
    expect(res.status).toBe(400);
    expect((await rowFor(email)).role).toBe('member');
  });

  test('a harmless update-user (name) still works', async () => {
    const { email, cookie } = await signUp();
    const res = await post('/update-user', { name: 'Renamed' }, cookie);
    expect(res.status).toBe(200);
    expect((await rowFor(email)).name).toBe('Renamed');
  });

  test('sign-up cannot smuggle approvalStatus: the default replaces the client value', async () => {
    const { res, email } = await signUp({ approvalStatus: 'approved' });
    expect(res.status).toBe(200);
    const row = await rowFor(email);
    expect(row.approvalStatus).toBe('pending');
    expect(row.role).toBe('member');
  });

  test('sign-up with role admin is rejected outright', async () => {
    const { res, email } = await signUp({ role: 'admin' });
    expect(res.status).toBe(400);
    expect(await rowFor(email)).toBeUndefined();
  });

  test('sign-up with a field that has no default (approvalReason) is rejected outright', async () => {
    const { res, email } = await signUp({ approvalReason: 'forged' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code?: string }).code).toBe('FIELD_NOT_ALLOWED');
    expect(await rowFor(email)).toBeUndefined();
  });
});

describe('P1 §7 #1: additionalFields reach the timestamptz column; defaultValue is used on createUser', () => {
  async function createViaAdapter(data: Record<string, unknown> = {}) {
    const ctx = await auth.$context;
    const id = `${TAG}-${crypto.randomUUID().slice(0, 6)}`;
    createdIds.push(id);
    const created = await ctx.internalAdapter.createUser(
      {
        id,
        name: id,
        email: `${id}@test.local`,
        emailVerified: true,
        ...data,
      },
      // Same provisioning source the Google callback passes (social path).
      { method: 'oauth', oauth: { providerId: 'google' } },
    );
    return { id, created };
  }

  test('approval_decided_at is a timestamptz column and a Date round-trips exactly', async () => {
    const [col] = (await db.execute(
      sql`SELECT data_type FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'approval_decided_at'`,
    )) as unknown as Array<{ data_type: string }>;
    expect(col?.data_type).toBe('timestamp with time zone');

    const decided = new Date('2026-10-16T08:30:15.123Z');
    const { id } = await createViaAdapter({
      approvalStatus: 'approved',
      approvalDecidedAt: decided,
    });
    const [row] = await db.select().from(user).where(eq(user.id, id));
    expect(row.approvalStatus).toBe('approved');
    expect(row.approvalDecidedAt?.toISOString()).toBe(decided.toISOString());
  });

  test('createUser without approval fields writes the BA defaultValue into the INSERT itself', async () => {
    const original = db.insert;
    const captured: unknown[] = [];
    const insertSpy = spyOn(db, 'insert').mockImplementation(((table: unknown) => {
      const builder = original.call(db, table as never) as unknown as {
        values: (v: unknown) => unknown;
      };
      if (table !== user) return builder;
      const values = builder.values.bind(builder);
      builder.values = (v: unknown) => {
        captured.push(v);
        return values(v);
      };
      return builder;
    }) as unknown as typeof db.insert);

    const { id, created } = await createViaAdapter();
    insertSpy.mockRestore();

    // Not merely the SQL column default: the adapter put 'pending' in the values it sent.
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ approvalStatus: 'pending' });
    expect(created.approvalStatus).toBe('pending');
    const [row] = await db.select().from(user).where(eq(user.id, id));
    expect(row.approvalStatus).toBe('pending');
    expect(row.approvalDecidedAt).toBeNull();
  });
});
