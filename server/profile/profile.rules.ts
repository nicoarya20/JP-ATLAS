/** Limits and format rules for the own-profile fields; pure, so the settings form and the API share one source. */

/** Max characters for each free-text profile field (after trimming). */
export const PROFILE_NAME_MAX = 80;
export const PROFILE_NICKNAME_MAX = 30;
export const PROFILE_TITLE_MAX = 80;
export const PROFILE_DEPARTMENT_MAX = 80;
export const PROFILE_PHONE_MAX = 30;

/** Digits plus the usual separators of a phone number ("+62 812-3456-7890", "(021) 555.01"); blank clears it. */
const PHONE_FORMAT = /^[0-9+().\-\s]*$/;

/** The sentence shown when a phone number holds letters or other symbols. */
export const PHONE_FORMAT_ERROR =
  'Nomor HP hanya boleh berisi angka, spasi, +, -, titik, dan tanda kurung.';

/** True when `value` is blank or looks like a phone number (the length cap is checked separately). */
export function isPhoneFormat(value: string): boolean {
  return PHONE_FORMAT.test(value);
}
