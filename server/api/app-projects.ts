/** Project routes (`/api/app/projects`); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S1): diisi irisan S1 proyek; hapus dari tes app-stubs saat terisi
export const projectsApi = new Elysia({ prefix: '/projects' }).use(appContext);
