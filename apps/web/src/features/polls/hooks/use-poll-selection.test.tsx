import { act, renderHook } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { usePollSelection } from './use-poll-selection';

function deferred() {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('quick multi-select clicks build on the pending selection', async () => {
  const first = deferred();
  const second = deferred();
  const onVote = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const { result } = await renderHook(() =>
    usePollSelection({ multiSelect: true, myOptionIds: [] }, onVote, vi.fn())
  );
  await act(async () => result.current.toggle('o1'));
  await act(async () => result.current.toggle('o2'));
  expect(onVote).toHaveBeenNthCalledWith(1, ['o1']);
  expect(onVote).toHaveBeenNthCalledWith(2, ['o1', 'o2']);
  expect(result.current).toMatchObject({ busy: true, selected: ['o1', 'o2'] });
  await act(async () => {
    first.resolve(true);
    await first.promise;
  });
  expect(result.current.busy).toBe(true);
  await act(async () => {
    second.resolve(true);
    await second.promise;
  });
  expect(result.current.busy).toBe(false);
});

test('single-select replaces the choice; unticking the last choice and retract both retract', async () => {
  const onVote = vi.fn().mockResolvedValue(true);
  const onRetract = vi.fn().mockResolvedValue(true);
  const single = await renderHook(() =>
    usePollSelection({ multiSelect: false, myOptionIds: ['o1'] }, onVote, onRetract)
  );
  await act(async () => single.result.current.toggle('o2'));
  expect(onVote).toHaveBeenCalledWith(['o2']);
  await act(async () => single.result.current.retract());
  expect(onRetract).toHaveBeenCalledOnce();
  const multi = await renderHook(() =>
    usePollSelection({ multiSelect: true, myOptionIds: ['o1'] }, onVote, onRetract)
  );
  await act(async () => multi.result.current.toggle('o1'));
  expect(onRetract).toHaveBeenCalledTimes(2);
});
