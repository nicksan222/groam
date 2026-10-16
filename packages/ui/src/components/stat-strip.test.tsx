import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { StatStrip } from './stat-strip';

test('renders metric items with labels and values', async () => {
  await render(
    <StatStrip columns={3}>
      <StatStrip.Item label="Stops" value={4} />
      <StatStrip.Item label="Trip days" value="—" />
    </StatStrip>
  );

  await expect.element(page.getByText('Stops')).toBeInTheDocument();
  await expect.element(page.getByText('4')).toBeInTheDocument();
  await expect.element(page.getByText('Trip days')).toBeInTheDocument();
  await expect.element(page.getByText('—')).toBeInTheDocument();
});
