import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useProposalActionRunner } from './use-proposal-action-runner';

test('exposes the action label until the action settles', async () => {
  let finish: (value: boolean) => void = () => {};
  const action = () =>
    new Promise<boolean>((resolve) => {
      finish = resolve;
    });
  const { result } = renderHook(() => useProposalActionRunner());

  let outcome: Promise<boolean> | undefined;
  act(() => {
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
  const { result } = renderHook(() => useProposalActionRunner());

  await act(async () => {
    await expect(
      result.current.run('Rebasing', async () => Promise.reject(new Error('Offline')))
    ).rejects.toThrow('Offline');
  });

  expect(result.current.pendingAction).toBeNull();
});
