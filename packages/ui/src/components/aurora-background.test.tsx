import { render } from '@groam/vitest-config/react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { AuroraBackground } from './aurora-background';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('mounts the aurora host without crashing when WebGL is unavailable', async () => {
  await render(<AuroraBackground />);
  expect(document.querySelector('[data-slot="aurora-background"]')).toBeTruthy();
});
