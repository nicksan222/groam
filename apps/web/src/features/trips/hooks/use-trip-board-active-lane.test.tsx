import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, beforeEach, expect, test } from 'vite-plus/test';
import { useTripBoardActiveLane } from './use-trip-board-active-lane';

const scroller = document.createElement('div');
const ref = { current: scroller };

beforeEach(() => {
  scroller.style.cssText = 'display:flex;gap:10px;overflow-x:auto;width:200px;scroll-behavior:auto';
  for (const lane of ['agreed', 'review', 'open']) {
    const node = document.createElement('section');
    node.dataset.lane = lane;
    node.style.cssText = 'flex:none;width:180px;height:20px';
    scroller.append(node);
  }
  document.body.append(scroller);
});

afterEach(() => {
  scroller.replaceChildren();
  scroller.remove();
});

test('follows the lane nearest the middle as the scroller moves', async () => {
  const { result } = await renderHook(() => useTripBoardActiveLane(ref));
  expect(result.current.active).toBe('agreed');
  await act(async () => {
    scroller.scrollLeft = 190;
    scroller.dispatchEvent(new Event('scroll'));
  });
  expect(result.current.active).toBe('review');
});

test('scrolls a lane to the middle on request', async () => {
  const { result } = await renderHook(() => useTripBoardActiveLane(ref));
  await act(async () => result.current.show('review'));
  await expect.poll(() => scroller.scrollLeft).toBe(190 + 90 - 100);
});
