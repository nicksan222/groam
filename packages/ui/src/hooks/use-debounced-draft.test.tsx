import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { useDebouncedDraft } from './use-debounced-draft';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const mount = async (value = '') => {
  const onCommit = vi.fn();
  const hook = await renderHook(
    (props: { value: string }) => useDebouncedDraft({ delay: 100, onCommit, value: props.value }),
    { initialProps: { value } }
  );
  return { ...hook, onCommit };
};

test('the draft follows each keystroke while the commit waits for a pause', async () => {
  const { onCommit, result } = await mount();
  await act(async () => result.current.change('a'));
  await act(async () => vi.advanceTimersByTime(60));
  await act(async () => result.current.change('ab'));
  expect(result.current.draft).toBe('ab');
  await act(async () => vi.advanceTimersByTime(99));
  expect(onCommit).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTime(1));
  expect(onCommit).toHaveBeenCalledOnce();
  expect(onCommit).toHaveBeenCalledWith('ab');
});

test('flush commits at once and drops the pending commit', async () => {
  const { onCommit, result } = await mount();
  await act(async () => result.current.change('be'));
  await act(async () => result.current.flush('beach'));
  expect(result.current.draft).toBe('beach');
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('beach');
  await act(async () => vi.advanceTimersByTime(500));
  expect(onCommit).toHaveBeenCalledOnce();
});

test('a change from outside replaces the draft and cancels a stale commit', async () => {
  const { onCommit, rerender, result } = await mount('old');
  await act(async () => result.current.change('typed'));
  await rerender({ value: '' });
  expect(result.current.draft).toBe('');
  await act(async () => vi.advanceTimersByTime(500));
  expect(onCommit).not.toHaveBeenCalled();
});

test('unmounting drops a pending commit', async () => {
  const { onCommit, result, unmount } = await mount();
  await act(async () => result.current.change('late'));
  await unmount();
  await act(async () => vi.advanceTimersByTime(500));
  expect(onCommit).not.toHaveBeenCalled();
});

test('the echo of an earlier commit does not undo what was typed since', async () => {
  const { onCommit, rerender, result } = await mount();
  await act(async () => result.current.change('ab'));
  await act(async () => vi.advanceTimersByTime(100));
  await act(async () => result.current.change('abc'));
  await rerender({ value: 'ab' });
  expect(result.current.draft).toBe('abc');
  await act(async () => vi.advanceTimersByTime(100));
  expect(onCommit).toHaveBeenLastCalledWith('abc');
});

test('an outside value equal to the draft keeps the pending commit', async () => {
  const { onCommit, rerender, result } = await mount();
  await act(async () => result.current.change('same'));
  await rerender({ value: 'same' });
  expect(result.current.draft).toBe('same');
  await act(async () => vi.advanceTimersByTime(100));
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('same');
});
