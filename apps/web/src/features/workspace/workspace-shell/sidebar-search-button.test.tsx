import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useCommandPaletteChrome } from '@/features/workspace/hooks/command-palette-chrome';
import { testIds } from '@/lib/test-ids';
import { SidebarSearchButton } from './sidebar-search-button';

test('sidebar search button opens the command palette and shows the shortcut', async () => {
  useCommandPaletteChrome.setState({ open: false, query: '' });
  await render(
    <SidebarProvider>
      <SidebarSearchButton />
    </SidebarProvider>
  );
  const trigger = page.getByTestId(testIds.commandPaletteTrigger);
  await expect.element(trigger.getByText('Search')).toBeVisible();
  await expect.element(trigger.getByText(/^(⌘|Ctrl)K$/u)).toBeVisible();
  await trigger.click();
  expect(useCommandPaletteChrome.getState().open).toBe(true);
});
