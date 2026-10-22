/** User factory (S0B-21): approved accounts with unique ids, tracked for cleanup. */
import { db } from '../../server/db';
import { user } from '../../server/db/schema';
import type { Role } from '../../server/permissions';
import { testUser } from './accounts';
import type { Cleaner } from './cleanup';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type TestUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  approvalStatus: ApprovalStatus;
  banned: boolean;
};

export type UserOptions = {
  role?: Role;
  status?: ApprovalStatus;
  banned?: boolean;
  name?: string;
};

export type UserFactory = { user(opts?: UserOptions): Promise<TestUser> };

const TAG_RANDOM_LENGTH = 8;
const randomTag = () => crypto.randomUUID().slice(0, TAG_RANDOM_LENGTH);

/** Builds `f.user(...)`; every id is `${tag}-${uuid8}` so lists can be scoped to the file's tag. */
export function createUserFactory(
  cleaner: Cleaner,
  opts: { tag?: string } = {},
): UserFactory & { tag: string } {
  const tag = opts.tag ?? `t${randomTag()}`;
  return {
    tag,
    async user({ role = 'member', status = 'approved', banned = false, name } = {}) {
      const id = `${tag}-${randomTag()}`;
      // Track before the insert: a failed insert then still gets its (absent) row swept, never leaked.
      cleaner.track('user', id);
      const row = testUser({
        id,
        name: name ?? `Pengguna ${id}`, // test-only
        role,
        approvalStatus: status,
        banned,
      });
      await db.insert(user).values(row);
      return { id, name: row.name, email: row.email, role, approvalStatus: status, banned };
    },
  };
}
