import { act, renderHook } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { useProposalActionRunner } from './use-proposal-action-runner';

test('exposes the action label until the action settles', async () => {
  let finish: (value: boolean) => void = () => {};
  const action = () =>
    new Promise<boolean>((resolve) => {
      finish = resolve;
    });
  const { result } = await renderHook(() => useProposalActionRunner());

  let outcome: Promise<boolean> | undefined;
  await act(() => {
    outcome = result.current.run('Applying idea', action);
  });
  expect(result.current.pendingAction).toBe('Applying idea');

  await act(async () => {
    finish(true);
    await outcome;
  });

  expect(result.current.pendingAction).toBeNull();
});

test('clears the pending label after a rejected action', async () => {
  const { result } = await renderHook(() => useProposalActionRunner());

  await act(async () => {
    await expect(
      result.current.run('Rebasing', async () => Promise.reject(new Error('Offline')))
    ).rejects.toThrow('Offline');
  });

  expect(result.current.pendingAction).toBeNull();
});

test('drops a second action while one is in flight', async () => {
  let finish: (value: boolean) => void = () => {};
  const first = () =>
    new Promise<boolean>((resolve) => {
      finish = resolve;
    });
  const second = vi.fn(async () => true);
  const { result } = await renderHook(() => useProposalActionRunner());

  let firstOutcome: Promise<boolean> | undefined;
  await act(() => {
    firstOutcome = result.current.run('Applying idea', first);
  });
  let ignored: boolean | undefined;
  await act(async () => {
    ignored = await result.current.run('Rebasing', second);
  });
  expect(ignored).toBe(false);
  expect(second).not.toHaveBeenCalled();
  expect(result.current.pendingAction).toBe('Applying idea');

  await act(async () => {
    finish(true);
    await firstOutcome;
  });
  expect(result.current.pendingAction).toBeNull();
});
