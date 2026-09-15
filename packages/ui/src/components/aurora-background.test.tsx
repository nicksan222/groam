import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AuroraBackground } from './aurora-background';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('mounts the aurora host without crashing when WebGL is unavailable', () => {
  render(<AuroraBackground />);
  expect(document.querySelector('[data-slot="aurora-background"]')).toBeTruthy();
});
