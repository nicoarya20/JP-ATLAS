/**
 * Client types for the leave UI. Since P14 nobody applies for leave in the app — Admin records it
 * (P14 D2/D3) — so Ketersediaan on /app/settings only reads, and this module holds no write at all:
 * the last two left with the Inbox approval card and its notification kinds (P14 CU-06).
 */

/** What the settings loader hands the Ketersediaan card: the person's own state, read-only. */
export type LeavePageData = {
  /** The leave under way, or null when the person is here. */
  onLeaveUntil: string | null;
  /** Today in the team zone `YYYY-MM-DD`; the card never reads the browser clock. */
  today: string;
};
