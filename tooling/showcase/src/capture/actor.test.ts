import type { Locator, Page } from '@playwright/test';
import { expect, it, vi } from 'vitest';
import { createActor } from '#src/capture/actor';

it('re-resolves a target that detaches while scrolling into view', async () => {
  const move = vi.fn();
  const page = {
    mouse: { move },
    viewportSize: () => ({ height: 100, width: 200 })
  } as unknown as Page;
  const target = {
    boundingBox: vi.fn().mockResolvedValue({ height: 20, width: 40, x: 30, y: 10 }),
    scrollIntoViewIfNeeded: vi
      .fn()
      .mockRejectedValueOnce(
        new Error('scrollIntoViewIfNeeded: Element is not attached to the DOM')
      )
      .mockResolvedValueOnce(undefined)
  } as unknown as Locator;
  const cursor: Array<{ atMs: number; click: boolean; x: number; y: number }> = [];

  await createActor(page, cursor, () => 100).point(target);

  expect(target.scrollIntoViewIfNeeded).toHaveBeenCalledTimes(2);
  expect(target.boundingBox).toHaveBeenCalledOnce();
  expect(move).toHaveBeenCalledWith(50, 20, { steps: 5 });
  expect(cursor.at(-1)).toEqual({ atMs: 100, click: false, x: 0.25, y: 0.2 });
});
