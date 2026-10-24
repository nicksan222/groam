import { onTestFinished } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { defaultViewport } from './default-viewport.ts';

/** Resizes the browser viewport for the current test only; it returns to the default afterwards. */
export async function useViewport(width: number, height: number): Promise<void> {
  onTestFinished(() => page.viewport(defaultViewport.width, defaultViewport.height));
  await page.viewport(width, height);
}
