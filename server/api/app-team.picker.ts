/** People picker routes (`/api/app/team`); empty until the slice fills them. */
import { Elysia } from 'elysia';
import { appContext } from './app-context';

// STUB(S1): diisi irisan S1 pemilih orang (GET /team/picker); hapus dari tes app-stubs saat terisi
export const teamPickerApi = new Elysia({ prefix: '/team' }).use(appContext);
