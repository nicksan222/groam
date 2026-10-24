import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { EditorDestinationPhoto } from './editor-destination-photo';

// A one-pixel PNG the browser can really load.
const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('replaces a broken photo and recovers when a new photo arrives', async () => {
  const { rerender } = await render(<EditorDestinationPhoto src="/lisbon.jpg" name="Lisbon" />);
  // The missing path fails to load in the browser, as a broken photo would.
  await expect.element(page.getByRole('img', { name: 'Lisbon · Photo unavailable' })).toBeVisible();
  await rerender(<EditorDestinationPhoto src={pixel} name="Lisbon" />);
  await expect.element(page.getByRole('img', { name: 'Lisbon' })).toHaveAttribute('src', pixel);
});

test('keeps missing thumbnails decorative when the destination is already named', async () => {
  await render(<EditorDestinationPhoto src={null} name="" />);
  await expect.element(page.getByRole('img')).not.toBeInTheDocument();
});
