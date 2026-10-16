import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResolutionRow } from '@/features/trips/hooks/detail-resolution-values';
import { ResolveResultPreview } from './resolve-result-preview';

const rows: ResolutionRow[] = [
  {
    key: 'name',
    label: 'Trip name',
    media: false,
    mine: 'My plan',
    mineMedia: [],
    shared: 'Shared plan',
    sharedMedia: []
  },
  {
    key: 'notes',
    label: 'Date notes',
    media: false,
    mine: 'Mine notes',
    mineMedia: [],
    shared: 'Shared notes',
    sharedMedia: []
  },
  {
    key: 'cover',
    label: 'Cover',
    media: true,
    mine: '',
    mineMedia: [],
    shared: '',
    sharedMedia: []
  }
];

test('previews each row according to the choice made', async () => {
  await render(
    <ResolveResultPreview
      choices={{ name: 'mine', notes: 'shared' }}
      ideaBranchName="Lisbon alternatives"
      rows={rows}
      sharedBranchName="Summer trip"
    />
  );
  const section = page.getByRole('region', { name: 'Result preview' });
  await expect.element(section.getByText('From your idea · Lisbon alternatives')).toBeVisible();
  await expect.element(section.getByText('From shared trip · Summer trip')).toBeVisible();
  await expect.element(section.getByText('My plan')).toBeVisible();
  await expect.element(section.getByText('Shared notes')).toBeVisible();
  await expect.element(section.getByText('Shared plan')).not.toBeInTheDocument();
  await expect.element(section.getByText('Not selected')).toBeVisible();
  await expect.element(section.getByText('Choose what to keep in the split view.')).toBeVisible();
});

test('renders no rows when there is nothing to resolve', async () => {
  await render(
    <ResolveResultPreview choices={{}} ideaBranchName="Idea" rows={[]} sharedBranchName="Shared" />
  );
  await expect.element(page.getByText('This idea after applying')).toBeVisible();
  await expect.element(page.getByText('Not selected')).not.toBeInTheDocument();
});
