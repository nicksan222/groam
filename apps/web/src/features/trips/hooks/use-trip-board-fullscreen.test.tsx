import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { useTripBoardFullscreen } from './use-trip-board-fullscreen';

afterEach(() => {
  vi.restoreAllMocks();
});

test('requests fullscreen for the page and follows the browser’s state', async () => {
  const request = vi.spyOn(document.documentElement, 'requestFullscreen').mockResolvedValue();
  const { result } = await renderHook(() => useTripBoardFullscreen());
  expect(result.current.active).toBe(false);

  await act(async () => result.current.toggle());
  expect(request).toHaveBeenCalledOnce();

  vi.spyOn(document, 'fullscreenElement', 'get').mockReturnValue(document.documentElement);
  await act(async () => document.dispatchEvent(new Event('fullscreenchange')));
  expect(result.current.active).toBe(true);

  vi.spyOn(document, 'fullscreenElement', 'get').mockReturnValue(null);
  await act(async () => document.dispatchEvent(new Event('fullscreenchange')));
  expect(result.current.active).toBe(false);
});

test('leaves fullscreen when the page already has it', async () => {
  vi.spyOn(document, 'fullscreenElement', 'get').mockReturnValue(document.documentElement);
  const exit = vi.spyOn(document, 'exitFullscreen').mockResolvedValue();
  const { result } = await renderHook(() => useTripBoardFullscreen());
  await act(async () => result.current.toggle());
  expect(exit).toHaveBeenCalledOnce();
});

test('stays quiet when the browser refuses', async () => {
  vi.spyOn(document.documentElement, 'requestFullscreen').mockRejectedValue(
    new TypeError('Not allowed')
  );
  const { result } = await renderHook(() => useTripBoardFullscreen());
  await act(async () => result.current.toggle());
  expect(result.current.active).toBe(false);
});

test('reports whether the browser offers fullscreen', async () => {
  vi.spyOn(document, 'fullscreenEnabled', 'get').mockReturnValue(false);
  const { result } = await renderHook(() => useTripBoardFullscreen());
  expect(result.current.supported).toBe(false);
});
