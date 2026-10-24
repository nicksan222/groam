import { renderHook } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { useEmailDelivery } from './use-email-delivery';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

test('reports whether the deployment can deliver email', async () => {
  convex.useQuery.mockReturnValue(false);
  const { result } = await renderHook(() => useEmailDelivery());
  expect(result.current).toBe(false);
});
