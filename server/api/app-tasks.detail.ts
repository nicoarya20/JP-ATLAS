/** Task checklist, dependency, comment and timeline routes; empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S2): diisi irisan S2 detail tugas; hapus dari tes app-stubs saat terisi
export const taskDetailApi = new Elysia({ prefix: '/tasks' }).use(appContext);
