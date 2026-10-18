import { setTimeout } from 'node:timers/promises';
import type { Locator, Page } from '@playwright/test';
import type { ActorCapture } from '#src/model';

const targetRetryDelayMs = 50;
const targetRetryLimit = 3;

function isDetachedTarget(error: unknown) {
  return error instanceof Error && /element is not attached to the dom/i.test(error.message);
}

async function findTargetBox(target: Locator) {
  for (let attempt = 1; attempt <= targetRetryLimit; attempt++) {
    try {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (box) return box;
    } catch (error) {
      if (!isDetachedTarget(error) || attempt === targetRetryLimit) throw error;
    }

    if (attempt < targetRetryLimit) await setTimeout(targetRetryDelayMs);
  }

  throw new Error('Cannot point to an invisible target.');
}

export function createActor(page: Page, cursor: ActorCapture['cursor'], now: () => number) {
  let position = { x: 0.5, y: 0.5 };
  const mark = (click = false) => cursor.push({ ...position, atMs: now(), click });

  async function point(target: Locator) {
    const box = await findTargetBox(target);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Cannot point without a viewport.');
    mark();
    const x = Math.max(0, Math.min(viewport.width - 1, box.x + box.width / 2));
    const y = Math.max(0, Math.min(viewport.height - 1, box.y + box.height / 2));
    await page.mouse.move(x, y, { steps: 5 });
    await setTimeout(90);
    position = { x: x / viewport.width, y: y / viewport.height };
    mark();
  }

  return {
    page,
    point,
    async click(target: Locator) {
      await point(target);
      mark(true);
      await target.click();
    },
    async type(target: Locator, value: string) {
      await point(target);
      mark(true);
      await target.fill('');
      await target.pressSequentially(value, { delay: 12 });
    },
    async press(target: Locator, key: string) {
      await target.press(key);
    }
  };
}
