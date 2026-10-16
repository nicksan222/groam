import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripCover } from '@/types/trip-cover';
import { TripHeader } from './trip-header';

const cover: TripCover = {
  canRefresh: false,
  isBusy: false,
  onImageError: () => undefined,
  refresh: () => undefined,
  refreshLabel: 'Find another image',
  showPending: false,
  src: null
};

test('renders title, status, chips, and actions in one header', async () => {
  await render(
    <TripHeader
      actions={<button type="button">Do it</button>}
      chips={<span>Lisbon</span>}
      cover={cover}
      dataTripId="trip-1"
      status={<span>Editing idea</span>}
      testId="heading"
      title="Coast week"
    />
  );
  await expect.element(page.getByTestId('heading')).toHaveTextContent('Coast week');
  await expect.element(page.getByText('Editing idea')).toBeInTheDocument();
  await expect.element(page.getByText('Lisbon')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Do it' })).toBeInTheDocument();
  await expect.element(page.getByTestId('heading')).toHaveAttribute('data-trip-id', 'trip-1');
});
