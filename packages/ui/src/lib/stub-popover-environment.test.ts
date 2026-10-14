import { afterEach, expect, test, vi } from 'vite-plus/test';
import { stubPopoverEnvironment } from './stub-popover-environment';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('stubPopoverEnvironment restores ResizeObserver via unstubAllGlobals', () => {
  const original = globalThis.ResizeObserver;

  stubPopoverEnvironment();
  expect(globalThis.ResizeObserver).not.toBe(original);

  vi.unstubAllGlobals();
  expect(globalThis.ResizeObserver).toBe(original);
});
