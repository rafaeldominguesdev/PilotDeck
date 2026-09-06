/**
 * The type ramp (ux-v2 doctrine §2): the only five font sizes a component
 * rule may declare literally. Display/title/body/label/data.
 *
 * This is the single source both the doctrine table and the guard
 * (`type-ramp.test.ts`) read from — the numbers live here once.
 */
export const TYPE_RAMP_PX = [22, 16, 13, 12, 11] as const;
