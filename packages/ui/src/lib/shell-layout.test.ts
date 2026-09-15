import { describe, expect, test } from 'vitest';
import { shellSplitAsideClassName, shellSplitClassName } from './shell-layout';

describe('shellSplitClassName', () => {
  test('emits complete static grid-cols utilities Tailwind can see', () => {
    expect(shellSplitClassName({ asideWidth: 'xs', breakpoint: 'lg' })).toBe(
      'grid min-w-0 max-w-full items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]'
    );
    expect(shellSplitClassName({ asideWidth: 'sm', breakpoint: 'md' })).toContain(
      'md:grid-cols-[minmax(0,1fr)_20rem]'
    );
    expect(shellSplitClassName()).toContain('xl:grid-cols-[minmax(0,1fr)_22rem]');
  });
});

describe('shellSplitAsideClassName', () => {
  test('emits complete static sticky and divider utilities', () => {
    expect(
      shellSplitAsideClassName({ breakpoint: 'lg', mobileDivider: true, sticky: 'far' })
    ).toContain('lg:sticky lg:top-24');
    expect(
      shellSplitAsideClassName({ breakpoint: 'lg', mobileDivider: true, sticky: 'far' })
    ).toContain('lg:border-t-0 lg:pt-0');
  });
});
