import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useGenerateRule } from './use-generate-rule';

const convex = vi.hoisted(() => ({ useAction: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const rule = { items: [{ kind: 'within_budget' as const }], match: 'all' as const };

beforeEach(() => vi.clearAllMocks());

describe('useGenerateRule', () => {
  test('returns the drafted rule', async () => {
    const draft = vi.fn().mockResolvedValue({ label: 'Planned costs fit the budget', rule });
    convex.useAction.mockReturnValue(draft);
    const { result } = await renderHook(() => useGenerateRule());
    await act(async () => expect(await result.current('stay on budget')).toEqual(rule));
    expect(draft).toHaveBeenCalledWith({ text: 'stay on budget' });
  });

  test('toasts and returns null when drafting fails', async () => {
    convex.useAction.mockReturnValue(vi.fn().mockRejectedValue(new Error('Connect ChatGPT')));
    const { result } = await renderHook(() => useGenerateRule());
    await act(async () => expect(await result.current('anything')).toBeNull());
    expect(notifications.error).toHaveBeenCalledWith('Connect ChatGPT');
  });
});
