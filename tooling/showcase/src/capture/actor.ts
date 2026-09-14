import { setTimeout } from 'node:timers/promises';
import type { Locator, Page } from '@playwright/test';
import type { ActorCapture } from '#src/model';

export function createActor(page: Page, cursor: ActorCapture['cursor'], now: () => number) {
  let position = { x: 0.5, y: 0.5 };
  const mark = (click = false) => cursor.push({ ...position, atMs: now(), click });

  async function point(target: Locator) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('Cannot point to an invisible target.');
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
