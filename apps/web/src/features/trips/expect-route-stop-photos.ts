import { screen } from '@testing-library/react';
import { expect } from 'vitest';
import { testIds } from '@/lib/test-ids';

/** Shared assertions for route-stop photo markers in trip overview / itinerary tests. */
export function expectRouteStopPhotos(firstImageSrc: string) {
  const photos = screen.getAllByTestId(testIds.tripRouteStopPhoto);
  expect(photos).toHaveLength(2);
  expect(photos[0]?.querySelector('img')?.getAttribute('src')).toBe(firstImageSrc);
  expect(photos[0]?.textContent).toContain('1');
  expect(photos[1]?.textContent).toContain('2');
  expect(photos[1]?.querySelector('img')).toBeNull();
}
