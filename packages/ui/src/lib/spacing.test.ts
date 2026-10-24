import { describe, expect, it } from 'vite-plus/test';
import { SPACING_STEPS } from '#src/lib/spacing';

describe('SPACING_STEPS', () => {
  it('stays on the 4px grid with no half steps', () => {
    expect(SPACING_STEPS.every((step) => Number.isInteger(step))).toBe(true);
    expect([...SPACING_STEPS]).toEqual([...SPACING_STEPS].sort((a, b) => a - b));
  });
});
