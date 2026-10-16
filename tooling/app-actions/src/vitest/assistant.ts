import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { assistantPanel } from './locators';
import { tap } from './queries';

export async function openGroamAssistant(): Promise<void> {
  await tap(page.getByRole('button', { name: 'Open Groam AI' }));
  const panel = assistantPanel();
  await expect.element(panel).toBeVisible();
  await expect.element(panel.getByRole('textbox', { name: 'Assistant prompt' })).toBeEnabled();
}
