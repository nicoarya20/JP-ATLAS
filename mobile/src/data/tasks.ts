/*
 * What other modules still take from the Tasks data under one name: the card type, the project's task settings
 * (sample, T-7) and the CSV import / Just write sample screens. The lists themselves read the server (tasks.list).
 */

export type { TaskCard } from './tasks.card';
export { getTaskSettings } from './tasks.settings';
export { getCsvImport, getQuickWrite } from './tasks.write';
