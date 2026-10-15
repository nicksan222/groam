import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';

/** Shared assertions for route-stop photo markers in trip overview / itinerary tests. */
export async function expectRouteStopPhotos(firstImageSrc: string) {
  const photos = page.getByTestId(testIds.tripRouteStopPhoto);
  await expect.poll(() => photos.elements()).toHaveLength(2);
  const [first, second] = photos.elements();
  expect(first?.querySelector('img')?.getAttribute('src')).toBe(firstImageSrc);
  expect(first?.textContent).toContain('1');
  expect(second?.textContent).toContain('2');
  expect(second?.querySelector('img')).toBeNull();
}
