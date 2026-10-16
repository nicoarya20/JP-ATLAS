/** Trash routes (`/api/app/trash`); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S1): diisi irisan S1 Sampah proyek (daftar dan pulihkan); hapus dari tes app-stubs saat terisi
export const trashApi = new Elysia({ prefix: '/trash' }).use(appContext);
