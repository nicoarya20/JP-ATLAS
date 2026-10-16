/** Project soft-delete route (`DELETE /api/app/projects/:id`); empty until the slice fills it. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S1): diisi irisan S1 hapus proyek ke Sampah; hapus dari tes app-stubs saat terisi
export const projectTrashApi = new Elysia({ prefix: '/projects' }).use(appContext);
