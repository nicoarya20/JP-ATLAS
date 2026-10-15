import { describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';
import { env } from '../../server/env';
import { pgClient } from '../../server/local-pg/client';

describe('DB session time zone', () => {
  it('the app pool runs in UTC regardless of the host zone', async () => {
    const rows = await db.execute<{ TimeZone: string }>(sql`SHOW TimeZone`);
    expect(rows[0].TimeZone).toBe('UTC');
  });

  it('the connection option is what sets it (control: another zone is honored)', async () => {
    const control = pgClient(env.DATABASE_URL_TEST as string, {
      max: 1,
      connection: { TimeZone: 'Asia/Jakarta' },
    });
    try {
      const rows = await control`SHOW TimeZone`;
      expect(rows[0].TimeZone).toBe('Asia/Jakarta');
    } finally {
      await control.end({ timeout: 5 });
    }
  });
});
