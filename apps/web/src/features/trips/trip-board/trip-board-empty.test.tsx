import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripBoardEmpty } from './trip-board-empty';

test('shows the note it is given', async () => {
  await render(<TripBoardEmpty>Nothing here yet.</TripBoardEmpty>);
  await expect.element(page.getByText('Nothing here yet.')).toBeVisible();
});
