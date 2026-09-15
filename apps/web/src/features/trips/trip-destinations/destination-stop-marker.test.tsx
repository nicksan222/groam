import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DestinationStopMarker } from './destination-stop-marker';

afterEach(cleanup);

test('announces photo discovery and then image loading until the image arrives', () => {
  const { container, rerender } = render(
    <DestinationStopMarker coverStatus="pending" coverUrl={null} name="Lisbon" stop={1} />
  );
  expect(screen.getByRole('status').textContent).toContain('Finding a photo of Lisbon');
  rerender(
    <DestinationStopMarker coverStatus="ready" coverUrl="/lisbon.jpg" name="Lisbon" stop={1} />
  );
  expect(screen.getByRole('status').textContent).toContain('Loading photo of Lisbon');
  const photo = container.querySelector('img');
  if (!photo) throw new Error('Expected destination photo');
  fireEvent.load(photo);
  expect(screen.queryByRole('status')).toBeNull();
  rerender(
    <DestinationStopMarker coverStatus="ready" coverUrl="/new-lisbon.jpg" name="Lisbon" stop={1} />
  );
  expect(screen.getByRole('status').textContent).toContain('Loading photo of Lisbon');
});

test('hands failed images back to the compact destination fallback', () => {
  const onCoverError = vi.fn();
  const { container } = render(
    <DestinationStopMarker
      coverStatus="ready"
      coverUrl="/broken.jpg"
      name="Lisbon"
      onCoverError={onCoverError}
      stop={1}
    />
  );
  const photo = container.querySelector('img');
  if (!photo) throw new Error('Expected destination photo');
  fireEvent.error(photo);
  expect(onCoverError).toHaveBeenCalledOnce();
});
