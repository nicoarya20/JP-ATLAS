/** Task list and detail routes (`/api/app/tasks`); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S2): diisi irisan S2 tugas (daftar); hapus dari tes app-stubs saat terisi
export const tasksApi = new Elysia({ prefix: '/tasks' }).use(appContext);
