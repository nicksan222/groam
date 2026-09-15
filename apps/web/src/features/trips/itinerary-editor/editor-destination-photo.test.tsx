import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { EditorDestinationPhoto } from './editor-destination-photo';

afterEach(cleanup);

test('replaces a broken photo and recovers when a new photo arrives', () => {
  const { rerender } = render(<EditorDestinationPhoto src="/lisbon.jpg" name="Lisbon" />);
  fireEvent.error(screen.getByRole('img', { name: 'Lisbon' }));
  expect(screen.getByRole('img', { name: 'Lisbon · Photo unavailable' })).toBeTruthy();
  rerender(<EditorDestinationPhoto src="/lisbon-new.jpg" name="Lisbon" />);
  expect(screen.getByRole('img', { name: 'Lisbon' }).getAttribute('src')).toBe('/lisbon-new.jpg');
});

test('keeps missing thumbnails decorative when the destination is already named', () => {
  render(<EditorDestinationPhoto src={null} name="" />);
  expect(screen.queryByRole('img')).toBeNull();
});
