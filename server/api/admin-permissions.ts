/**
 * Read-only role matrix under `/api/admin/permissions-matrix` (P11 AD-09). Nested in adminApi, so
 * Admin and Super-admin may read it; nobody may write it — the matrix is derived from
 * `server/permissions.ts` on every call, and roles are changed from the Pengguna menu instead.
 */
import { Elysia } from 'elysia';
import { adminContext } from './admin-context';
import { buildPermissionsMatrix } from './admin-permissions.matrix';

export const adminPermissionsApi = new Elysia()
  .use(adminContext)
  .get('/permissions-matrix', () => buildPermissionsMatrix());
