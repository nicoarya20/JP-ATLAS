import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { count, inArray } from 'drizzle-orm';
import { db } from '../../server/db';
import { user } from '../../server/db/schema';
import { registerDbTools } from '../../server/mcp/tools/db';
import { testUser } from '../support/accounts';

type ToolResult = { content: Array<{ text: string }> };
type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

// Call tool handlers directly: the HTTP endpoint suite is skipped without MCP_ADMIN_TOKEN.
const handlers = new Map<string, Handler>();
registerDbTools({
  registerTool: (name: string, _cfg: unknown, handler: Handler) => handlers.set(name, handler),
} as unknown as McpServer);
const call = async (name: string, args: Record<string, unknown> = {}) =>
  JSON.parse((await (handlers.get(name) as Handler)(args)).content[0].text);

const TAG = `mcpanon-${crypto.randomUUID().slice(0, 8)}`;
const realId = `${TAG}-real`;
const legacyId = `${TAG}-legacy`;

beforeAll(async () => {
  const now = new Date();
  await db.insert(user).values(
    [
      {
        id: realId,
        name: `${TAG} Real`,
        email: `${TAG}-real@test.local`,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: legacyId,
        name: `${TAG} Legacy`,
        email: `${TAG}-legacy@test.local`,
        isAnonymous: true,
        createdAt: now,
        updatedAt: now,
      },
    ].map((u) => testUser(u)),
  );
});

afterAll(async () => {
  await db.delete(user).where(inArray(user.id, [realId, legacyId]));
});

describe('MCP db tools exclude leftover anonymous users', () => {
  test('list_users omits anonymous users', async () => {
    const rows = (await call('list_users', { search: TAG })) as Array<{ id: string }>;
    expect(rows.map((r) => r.id)).toEqual([realId]);
  });

  test('get_db_stats user count skips anonymous users', async () => {
    const stats = (await call('get_db_stats')) as { user: number };
    const [all] = await db.select({ n: count() }).from(user);
    expect(stats.user).toBeLessThan(all.n);
  });
});
