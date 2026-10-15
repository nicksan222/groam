import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { by } from './locators';
import { tap } from './queries';

/** Opens Settings > AI > Background activity and its first run; reports which it found. */
export async function openBackgroundActivity(): Promise<'empty' | 'run'> {
  await tap(by(ids.navSettings));
  await tap(by(ids.settingsSectionAi));
  await tap(page.getByRole('link', { name: 'Background activity' }));
  await expect.element(by(ids.agentsTitle)).toMatchTextContent('Background activity');
  await expect.poll(() => document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
  const run = by(ids.agentRunFeedRunCell).getByRole('link').first();
  if (run.elements().length === 0) return 'empty';
  await tap(run);
  await expect.element(by(ids.agentRunDetail)).toBeVisible();
  return 'run';
}
