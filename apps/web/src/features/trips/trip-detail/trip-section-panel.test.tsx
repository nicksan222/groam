import { render } from '@groam/vitest-config/react';
import { Map } from 'lucide-react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripSectionPanel } from './trip-section-panel';

describe('TripSectionPanel', () => {
  test('renders title, description and children', async () => {
    await render(
      <TripSectionPanel description="Where you are going" icon={Map} title="Route">
        <p>Panel body</p>
      </TripSectionPanel>
    );
    await expect.element(page.getByText('Route', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Where you are going')).toBeVisible();
    await expect.element(page.getByText('Panel body')).toBeVisible();
  });

  test.each(['md', 'page', 'sm'] as const)('renders with %s stack', async (stack) => {
    await render(
      <TripSectionPanel description="d" icon={Map} stack={stack} title="Route">
        <p>Body {stack}</p>
      </TripSectionPanel>
    );
    await expect.element(page.getByText(`Body ${stack}`)).toBeVisible();
  });

  test('renders a badge and trailing control when given', async () => {
    await render(
      <TripSectionPanel
        badge="3 stops"
        description="d"
        icon={Map}
        title="Route"
        trailing={<button type="button">Add</button>}
      >
        <p>x</p>
      </TripSectionPanel>
    );
    await expect.element(page.getByText('3 stops')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });
});
