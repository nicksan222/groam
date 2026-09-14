import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useReadyValue } from '@/lib/use-ready-value';

test('stays loading until the first ready value arrives', () => {
  const { result, rerender } = renderHook(
    ({ value }: { value: string | undefined }) => useReadyValue(value),
    { initialProps: { value: undefined as string | undefined } }
  );

  expect(result.current.isLoading).toBe(true);
  expect(result.current.value).toBeUndefined();

  act(() => {
    rerender({ value: 'ready' });
  });

  expect(result.current.isLoading).toBe(false);
  expect(result.current.value).toBe('ready');
});

test('stays ready when the value briefly clears during a refetch', () => {
  const { result, rerender } = renderHook(
    ({ resetKey, value }: { resetKey: string; value: string | undefined }) =>
      useReadyValue(value, resetKey),
    { initialProps: { resetKey: 'trip-1', value: undefined as string | undefined } }
  );

  act(() => {
    rerender({ resetKey: 'trip-1', value: 'ready' });
  });
  expect(result.current.isLoading).toBe(false);

  act(() => {
    rerender({ resetKey: 'trip-1', value: undefined });
  });

  expect(result.current.isLoading).toBe(false);
  expect(result.current.value).toBe('ready');
});

test('resets loading when resetKey changes', () => {
  const { result, rerender } = renderHook(
    ({ resetKey, value }: { resetKey: string; value: string | undefined }) =>
      useReadyValue(value, resetKey),
    { initialProps: { resetKey: 'trip-1', value: 'ready' as string | undefined } }
  );

  act(() => {
    rerender({ resetKey: 'trip-2', value: undefined });
  });

  expect(result.current.isLoading).toBe(true);
  expect(result.current.value).toBeUndefined();
});

test('does not re-render when an equal value arrives with a new identity', () => {
  let renders = 0;
  const { rerender, result } = renderHook(
    ({ value }: { value: { name: string } | undefined }) => {
      renders++;
      return useReadyValue(value, 'trip-1');
    },
    { initialProps: { value: { name: 'Trip' } as { name: string } | undefined } }
  );

  const settled = renders;
  act(() => {
    rerender({ value: { name: 'Trip' } });
  });

  expect(renders).toBe(settled + 1);
  expect(result.current.isLoading).toBe(false);
});
