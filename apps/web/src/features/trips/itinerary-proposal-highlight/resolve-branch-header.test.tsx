import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResolveBranchHeader } from './resolve-branch-header';

test('labels the shared trip and idea sides with their branch names', async () => {
  await render(
    <ResolveBranchHeader ideaBranchName="Lisbon alternatives" sharedBranchName="Summer trip" />
  );
  const section = page.getByRole('region', { name: 'Compared sides' });
  await expect.element(section.getByText('Shared trip')).toBeVisible();
  await expect.element(section.getByText('Summer trip')).toBeVisible();
  await expect.element(section.getByText('This idea')).toBeVisible();
  await expect.element(section.getByText('Lisbon alternatives')).toBeVisible();
});
