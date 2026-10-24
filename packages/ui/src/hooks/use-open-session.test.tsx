import { renderHook } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { useOpenSession } from './use-open-session';

test('counts openings and keeps the count while closing', async () => {
  const { rerender, result } = await renderHook(({ open }) => useOpenSession(open), {
    initialProps: { open: false }
  });
  expect(result.current).toBe(0);
  await rerender({ open: true });
  expect(result.current).toBe(1);
  await rerender({ open: false });
  expect(result.current).toBe(1);
  await rerender({ open: true });
  expect(result.current).toBe(2);
});
