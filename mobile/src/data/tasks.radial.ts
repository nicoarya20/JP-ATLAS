import type { BoardStatus } from './tasks.columns';
import { STATUS_OF_SIDE } from './tasks.columns';

/*
 * Kanban move menu maths (prototype tasks.radial.js, tasks.radial.menu.jsx, tasks.radial.stack.jsx, tasks.css): hold a
 * card for HOLD_MS to open a ring of the four statuses, slide toward one (aimOf) and let go, or let go without sliding
 * and tap one. aimOf and clampCenter are worklets, so the gesture can call them on the UI thread.
 */

/** Hold this long before the menu opens. */
export const HOLD_MS = 350;
/** A finger that travels this far before the hold ends is a scroll, not a hold. */
export const SLOP_PX = 8;
/** Slide at least this far from where the hold started to aim at a status. */
export const PICK_PX = 28;
/** Keep the menu's centre this far from the screen's sides, top and bottom (one card). */
export const EDGE = { x: 164, top: 140, bottom: 200 } as const;
/** ...wider for a group, whose statuses sit further out. */
export const GROUP_EDGE = { x: 172, top: 164, bottom: 250 } as const;

/** Distance of the status options from the centre (tasks.css --r). */
export const OPTION_RADIUS = { one: 92, group: 116 } as const;
/** Ring box around the finger, or around a stack of cards, and the room left for its stroke. */
export const RING_PX = { one: 48, group: 124 } as const;
export const RING_PAD = 6;

/** Motion of the menu and the group stack, from tasks.css (ms unless named otherwise). */
export const MOTION = {
  /** Dim fade in. */
  fadeMs: 150,
  /** Each option pops in over this long, the sides one stagger apart (up, right, down, left). */
  optionMs: 200,
  optionStaggerMs: 25,
  /** Scale of the option aimed at. */
  aimScale: 1.12,
  /** Close: everything is gone after closeMs; options fold, the picked one swells, the dim fades. */
  closeMs: 240,
  foldMs: 160,
  swellMs: 180,
  /** Group stack: each card flies in over stackInMs, one stackStaggerMs after another, from scale stackFromScale. */
  stackInMs: 280,
  stackStaggerMs: 35,
  stackFromScale: 1.6,
  /** Cancelled: the cards fly back; moved: the stack flies stackAwayPx toward the status. */
  stackBackMs: 240,
  stackAwayMs: 220,
  stackAwayPx: 240,
  /** Each card under the top one leans this much more (alternating sides) and sits this much higher. */
  tiltDeg: 4,
  liftPx: 3,
  /** Select-all icon slide, cubic-bezier(0.32, 0.72, 0, 1). */
  selectAllMs: 220,
  selectAllBezier: [0.32, 0.72, 0, 1] as const,
} as const;

function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return Math.max(lo, Math.min(v, hi));
}

/** Status a slide of (dx, dy) px from the hold point aims at: the side of its longer axis, or null while still short. */
export function aimOf(dx: number, dy: number): BoardStatus | null {
  'worklet';
  if (Math.hypot(dx, dy) < PICK_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? STATUS_OF_SIDE.right : STATUS_OF_SIDE.left;
  return dy > 0 ? STATUS_OF_SIDE.down : STATUS_OF_SIDE.up;
}

/** Angle in degrees of a slide (for the ring's arc, drawn rotated by angle − 45). */
export function angleOf(dx: number, dy: number) {
  'worklet';
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Menu centre for a hold at (x, y) on a w × h screen, kept EDGE (or GROUP_EDGE) away from its sides. */
export function clampCenter(x: number, y: number, w: number, h: number, group: boolean) {
  'worklet';
  const edge = group ? GROUP_EDGE : EDGE;
  return { x: clamp(x, edge.x, w - edge.x), y: clamp(y, edge.top, h - edge.bottom) };
}

/**
 * Where a card's centre sits from the menu centre (cx, cy), pulled inside the w × h screen so a card in a column
 * scrolled off screen flies in from that edge. `card` = its window rect (measureInWindow).
 */
export function offsetOf(
  card: { x: number; y: number; width: number; height: number },
  w: number,
  h: number,
  cx: number,
  cy: number,
) {
  return {
    dx: clamp(card.x + card.width / 2, 0, w) - cx,
    dy: clamp(card.y + card.height / 2, 0, h) - cy,
  };
}

/** Pose of card i in the group stack: tilt (deg, alternating sides) and lift (px, negative = up). */
export const stackPose = (i: number) => ({
  tilt: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * MOTION.tiltDeg,
  lift: -i * MOTION.liftPx,
});
