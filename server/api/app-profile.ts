/** Profile routes (`/api/app/profile`); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S1): diisi irisan S1 profil; hapus dari tes app-stubs saat terisi
export const profileApi = new Elysia({ prefix: '/profile' }).use(appContext);
