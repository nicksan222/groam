import type { Page } from '@playwright/test';

function photonResult(query: string) {
  const porto = query.toLocaleLowerCase().includes('porto');
  return {
    features: [
      {
        geometry: {
          coordinates: porto ? [-8.610_99, 41.149_61] : [-9.136_592, 38.707_751],
          type: 'Point'
        },
        properties: {
          country: 'Portugal',
          countrycode: 'PT',
          name: porto ? 'Porto' : 'Lisbon',
          osm_id: porto ? 3_372_207 : 5_400_890,
          osm_type: 'R',
          osm_value: 'city'
        },
        type: 'Feature'
      }
    ],
    type: 'FeatureCollection'
  };
}

export async function mockDestinationSearch(page: Page): Promise<void> {
  await page.route('https://photon.komoot.io/api/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') ?? '';
    return route.fulfill({ json: photonResult(query) });
  });
}
