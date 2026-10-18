import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useTripBoardPan } from './use-trip-board-pan';

const scroller = document.createElement('div');
const ref = { current: scroller };
const empty = document.createElement('section');
const card = document.createElement('article');

const pointer = (x: number, over: Record<string, unknown> = {}) =>
  ({ button: 0, clientX: x, pointerId: 1, pointerType: 'mouse', target: empty, ...over }) as never;

beforeEach(() => {
  scroller.setPointerCapture = vi.fn();
  scroller.releasePointerCapture = vi.fn();
  Object.defineProperty(scroller, 'scrollLeft', { configurable: true, value: 100, writable: true });
});

test('pans against the pointer once it travels past the threshold, then lets go', async () => {
  const { result } = await renderHook(() => useTripBoardPan(ref, false));
  await act(async () => result.current.handlers.onPointerDown(pointer(300)));
  await act(async () => result.current.handlers.onPointerMove(pointer(298)));
  expect(scroller.scrollLeft).toBe(100);
  expect(result.current.panning).toBe(false);

  await act(async () => result.current.handlers.onPointerMove(pointer(240)));
  expect(scroller.scrollLeft).toBe(160);
  expect(result.current.panning).toBe(true);
  expect(scroller.setPointerCapture).toHaveBeenCalledWith(1);

  await act(async () => result.current.handlers.onPointerUp(pointer(240)));
  expect(result.current.panning).toBe(false);
  expect(scroller.releasePointerCapture).toHaveBeenCalledWith(1);
});

test.each([
  ['a touch', pointer(300, { pointerType: 'touch' }), false],
  ['a press on a card', pointer(300, { target: card }), false],
  ['a secondary button', pointer(300, { button: 2 }), false],
  ['a card being carried', pointer(300), true]
])('ignores %s', async (_name, down, disabled) => {
  const { result } = await renderHook(() => useTripBoardPan(ref, disabled));
  await act(async () => result.current.handlers.onPointerDown(down));
  await act(async () => result.current.handlers.onPointerMove(pointer(100)));
  expect(scroller.scrollLeft).toBe(100);
  expect(result.current.panning).toBe(false);
});
