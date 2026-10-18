import { expect, test } from 'vite-plus/test';
import { commands } from 'vite-plus/test/browser';
import { openSite } from './site-frame';

const loopingPages = [
  '/',
  '/features/',
  '/features/itinerary/',
  '/features/ideas/',
  '/features/issues/',
  '/features/conversations/',
  '/features/ai/',
  '/pricing/',
  '/404.html'
] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pauses every loop on the page with its own control, as a visitor would. */
async function pauseEverything(document: Document) {
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('button')].filter(
    (button) =>
      /^pause/iu.test(button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '') &&
      !button.hidden
  );
  for (const toggle of toggles) {
    toggle.scrollIntoView({ block: 'center' });
    toggle.click();
  }
  return toggles.length;
}

test.each(loopingPages)('%s: pause controls stop every endless animation', async (path) => {
  const { document } = await openSite(path);
  await wait(300);
  expect(await pauseEverything(document)).toBeGreaterThan(0);
  await wait(500);
  const running = document
    .getAnimations()
    .filter(
      (animation) =>
        animation.playState === 'running' &&
        animation.effect?.getComputedTiming().iterations === Infinity
    );
  expect(running.map((animation) => (animation as CSSAnimation).animationName ?? 'script')).toEqual(
    []
  );

  // One-shot reveals that scrolling the toggles into view started have time to finish.
  await wait(1_500);
  const before = document.querySelector('main')?.innerHTML;
  await wait(3_500);
  expect(document.querySelector('main')?.innerHTML).toBe(before);
  expect(await commands.takeErrors()).toEqual([]);
});

test('home loops keep running until paused', async () => {
  const { document } = await openSite('/');
  const endless = document
    .getAnimations()
    .filter((animation) => animation.effect?.getComputedTiming().iterations === Infinity);
  expect(endless.length).toBeGreaterThan(0);
});
