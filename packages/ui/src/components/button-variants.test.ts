import { describe, expect, test } from 'vitest';
import { type ButtonSize, type ButtonVariant, buttonVariants } from './button-variants';

describe('buttonVariants', () => {
  test('builds the default accessible button styles', () => {
    expect(buttonVariants()).toContain('bg-primary');
    expect(buttonVariants()).toContain('h-9');
    expect(buttonVariants()).toContain('focus-visible:ring-2');
    expect(buttonVariants()).toContain('inset-shadow-[0_1px_--theme(--color-white/16%)]');
  });

  test.each<[ButtonVariant, string]>([
    ['destructive', 'bg-destructive'],
    ['outline', 'border-input'],
    ['secondary', 'bg-secondary'],
    ['ghost', 'hover:bg-accent'],
    ['link', 'underline-offset-4']
  ])('includes the expected %s variant surface', (variant, expectedClass) => {
    expect(buttonVariants({ variant })).toContain(expectedClass);
  });

  test.each<[ButtonSize, string]>([
    ['xs', 'h-7'],
    ['sm', 'h-8'],
    ['lg', 'h-10'],
    ['icon', 'size-9'],
    ['icon-xs', 'size-7'],
    ['icon-sm', 'size-8'],
    ['icon-lg', 'size-10']
  ])('includes the expected %s dimensions', (size, expectedClass) => {
    const classes = buttonVariants({ size });
    expect(classes).toContain(expectedClass);
    expect(classes).not.toMatch(/sm:(?:h|size)-/);
  });

  test('keeps the default button at its standard height on larger screens', () => {
    expect(buttonVariants()).not.toContain('sm:h-8');
  });

  test('preserves caller classes and treats null options as defaults', () => {
    const classes = buttonVariants({ className: 'w-full', size: null, variant: null });
    expect(classes).toContain('w-full');
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('h-9');
  });
});
