/** Project member routes (`/api/app/projects/:id/members`); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S1): diisi irisan S1 anggota proyek; hapus dari tes app-stubs saat terisi
export const projectMembersApi = new Elysia({ prefix: '/projects' }).use(appContext);
