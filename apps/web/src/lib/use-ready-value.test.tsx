import { act, renderHook } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { useReadyValue } from '@/lib/use-ready-value';

test('stays loading until the first ready value arrives', async () => {
  const { result, rerender } = await renderHook(
    ({ value }: { value: string | undefined }) => useReadyValue(value),
    { initialProps: { value: undefined as string | undefined } }
  );

  expect(result.current.isLoading).toBe(true);
  expect(result.current.value).toBeUndefined();

  await act(async () => {
    await rerender({ value: 'ready' });
  });

  expect(result.current.isLoading).toBe(false);
  expect(result.current.value).toBe('ready');
});

test('stays ready when the value briefly clears during a refetch', async () => {
  const { result, rerender } = await renderHook(
    ({ resetKey, value }: { resetKey: string; value: string | undefined }) =>
      useReadyValue(value, resetKey),
    { initialProps: { resetKey: 'trip-1', value: undefined as string | undefined } }
  );

  await act(async () => {
    await rerender({ resetKey: 'trip-1', value: 'ready' });
  });
  expect(result.current.isLoading).toBe(false);

  await act(async () => {
    await rerender({ resetKey: 'trip-1', value: undefined });
  });

  expect(result.current.isLoading).toBe(false);
  expect(result.current.value).toBe('ready');
});

test('resets loading when resetKey changes', async () => {
  const { result, rerender } = await renderHook(
    ({ resetKey, value }: { resetKey: string; value: string | undefined }) =>
      useReadyValue(value, resetKey),
    { initialProps: { resetKey: 'trip-1', value: 'ready' as string | undefined } }
  );

  await act(async () => {
    await rerender({ resetKey: 'trip-2', value: undefined });
  });

  expect(result.current.isLoading).toBe(true);
  expect(result.current.value).toBeUndefined();
});

test('does not re-render when an equal value arrives with a new identity', async () => {
  let renders = 0;
  const { rerender, result } = await renderHook(
    ({ value }: { value: { name: string } | undefined }) => {
      renders++;
      return useReadyValue(value, 'trip-1');
    },
    { initialProps: { value: { name: 'Trip' } as { name: string } | undefined } }
  );

  const settled = renders;
  await act(async () => {
    await rerender({ value: { name: 'Trip' } });
  });

  expect(renders).toBe(settled + 1);
  expect(result.current.isLoading).toBe(false);
});
