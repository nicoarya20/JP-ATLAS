/** Task workflow routes (start, complete, cancel, ...); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S2): diisi irisan S2 alur kerja tugas; hapus dari tes app-stubs saat terisi
export const taskWorkflowApi = new Elysia({ prefix: '/tasks' }).use(appContext);
