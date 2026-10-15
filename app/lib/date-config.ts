import type { DayOfWeek } from '@mantine/dates';

/** Locale for every Mantine date input; paired with `dayjs/locale/id` imported in app/root.tsx. */
export const DATES_LOCALE = 'id';

/** Monday-first weeks: the Indonesian convention, and what the planned calendar views assume. */
export const FIRST_DAY_OF_WEEK: DayOfWeek = 1;
