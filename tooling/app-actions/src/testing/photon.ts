/** The Photon geocoder URL pattern the destination search calls. */
export const photonUrlPattern = 'https://photon.komoot.io/api/**';

/** A Photon response body made of the given GeoJSON features. */
function photonFeatureCollection(features: unknown[]) {
  return { features, type: 'FeatureCollection' };
}

/** What Photon answers for a query: Porto when asked about it, Lisbon otherwise. */
export function photonResult(query: string) {
  const porto = query.toLocaleLowerCase().includes('porto');
  return photonFeatureCollection([
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
  ]);
}
