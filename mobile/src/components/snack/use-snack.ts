// The one Undo snackbar of the app (prototype kit Snack, archive.undo): any screen shows it through useSnack(); the
// host in the tabs layout draws it. A new snack replaces the one showing; it hides itself after SNACK_MS (UX T1).
import { createStore, useStore } from '@/data/store';

/** How long a snack stays up: Undo is offered for 10 seconds (CLAUDE.md UX §1 T1). */
export const SNACK_MS = 10_000;

export type SnackMessage = {
  /** "Task moved to Archive". */
  message: string;
  /** Action button label ("Undo"). */
  action?: string;
  /** Runs when the action is pressed; the snack hides first. */
  onAction?: () => void;
};

export type Snack = SnackMessage & { id: number };

const snack = createStore<Snack | null>(null);
let lastId = 0;

/** Show `s`, replacing any snack on screen; returns its id for hideSnack. */
export function showSnack(s: SnackMessage): number {
  lastId += 1;
  snack.set({ ...s, id: lastId });
  return lastId;
}

/** Hide the snack; with `id`, only if that snack is still the one showing (its timer may outlive it). */
export function hideSnack(id?: number): void {
  snack.set((current) => (id === undefined || current?.id === id ? null : current));
}

const API = { show: showSnack, hide: hideSnack } as const;

/** `{ show, hide }` for a screen that offers Undo after an action. */
export const useSnack = () => API;

/** The snack showing now, or null (read by SnackHost). */
export const useCurrentSnack = () => useStore(snack);

/** No snack. test-only */
export const resetSnack = () => snack.reset();
