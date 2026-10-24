/**
 * The only spacing values Groam uses for padding, margin, gap, and `space-*` utilities.
 * Steps are Tailwind units on a 4px grid (`--spacing: 0.25rem`): no half steps, no arbitrary
 * pixel values. Enforced by the `spacing-scale` convention (`vp run lint:conventions`).
 *
 * | Step | Size | Use |
 * | --- | --- | --- |
 * | 0 | 0 | reset |
 * | 1 | 4px | icon-to-badge, tight inline pairs |
 * | 2 | 8px | inline gaps (icon + label), compact padding |
 * | 3 | 12px | row and control padding, small stacks |
 * | 4 | 16px | card padding, default stack |
 * | 6 | 24px | section stacks, page gutters |
 * | 8 | 32px | page-level rhythm, split-layout gaps |
 * | 12 | 48px | empty states, large page padding |
 * | 16 | 64px | page bottom clearance |
 *
 * Page and section rhythm is not chosen per component: use the tokens in `shell-layout.ts`.
 * Safe-area insets and `var(--…)` driven offsets may stay arbitrary (`pb-[max(1rem,env(…))]`).
 */
export const SPACING_STEPS = [0, 1, 2, 3, 4, 6, 8, 12, 16] as const;

export type SpacingStep = (typeof SPACING_STEPS)[number];
