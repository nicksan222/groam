import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { assistantPanel } from './locators';
import { tap } from './queries';

/** Opens the assistant drawer from the sidebar's Ask Groam (the top bar's Open Groam AI on phones). */
export async function openGroamAssistant(): Promise<void> {
  await tap(page.getByRole('button', { name: /^(?:Ask Groam|Open Groam AI)$/u }));
  const panel = assistantPanel();
  await expect.element(panel).toBeVisible();
  await expect.element(panel.getByRole('textbox', { name: 'Assistant prompt' })).toBeEnabled();
}
