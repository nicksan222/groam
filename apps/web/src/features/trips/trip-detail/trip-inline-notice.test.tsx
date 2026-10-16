import { render } from '@groam/vitest-config/react';
import { Info } from 'lucide-react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripInlineNotice } from './trip-inline-notice';

describe('TripInlineNotice', () => {
  test('labels the region by its title', async () => {
    await render(<TripInlineNotice title="Read only" />);
    await expect.element(page.getByRole('region', { name: 'Read only' })).toBeVisible();
    await expect.element(page.getByText('Read only')).toBeVisible();
  });

  test('prefers an explicit label over the title', async () => {
    await render(<TripInlineNotice label="Archive notice" title="Archived" />);
    await expect.element(page.getByRole('region', { name: 'Archive notice' })).toBeVisible();
  });

  test('renders body, action and icon when given', async () => {
    const screen = await render(
      <TripInlineNotice
        action={<button type="button">Restore</button>}
        icon={Info}
        title="Heads up"
      >
        More detail
      </TripInlineNotice>
    );
    await expect.element(page.getByText('More detail')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Restore' })).toBeVisible();
    expect(screen.container.querySelector('svg')).not.toBeNull();
  });

  test('omits body, action and icon when absent', async () => {
    const screen = await render(<TripInlineNotice title="Plain" />);
    expect(screen.container.querySelector('svg')).toBeNull();
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });
});
