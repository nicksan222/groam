import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DestinationStopMarker } from './destination-stop-marker';

// Real images: a one-pixel PNG loads, a missing path fails, so the browser fires the events.
const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('announces photo discovery and then image loading until the image arrives', async () => {
  const { rerender } = await render(
    <DestinationStopMarker coverStatus="pending" coverUrl={null} name="Lisbon" stop={1} />
  );
  expect(page.getByRole('status').element().textContent).toContain('Finding a photo of Lisbon');
  await rerender(
    <DestinationStopMarker
      coverStatus="ready"
      coverUrl={`${pixel}#lisbon`}
      name="Lisbon"
      stop={1}
    />
  );
  expect(page.getByRole('status').element().textContent).toContain('Loading photo of Lisbon');
  await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  await rerender(
    <DestinationStopMarker
      coverStatus="ready"
      coverUrl={`${pixel}#new-lisbon`}
      name="Lisbon"
      stop={1}
    />
  );
  expect(page.getByRole('status').element().textContent).toContain('Loading photo of Lisbon');
  await expect.element(page.getByRole('status')).not.toBeInTheDocument();
});

test('hands failed images back to the compact destination fallback', async () => {
  const onCoverError = vi.fn();
  await render(
    <DestinationStopMarker
      coverStatus="ready"
      coverUrl="/broken.jpg"
      name="Lisbon"
      onCoverError={onCoverError}
      stop={1}
    />
  );
  await expect.poll(() => onCoverError.mock.calls.length).toBe(1);
});
