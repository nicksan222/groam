import { MapPinned } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { MetricTiles } from './metric-tiles';

test('renders compact metric tiles with short and long labels', async () => {
  await render(
    <MetricTiles
      items={[
        { icon: MapPinned, label: 'Trips', longLabel: 'Active trips', value: 7 },
        { label: 'Settled', value: 3 }
      ]}
    />
  );

  await expect.element(page.getByText('7')).toBeInTheDocument();
  await expect.element(page.getByText('Active trips')).toBeInTheDocument();
  await expect.element(page.getByText('Trips')).toBeInTheDocument();
  await expect.element(page.getByText('3')).toBeInTheDocument();
  expect(page.getByText('Settled').elements()).toHaveLength(2);
});
