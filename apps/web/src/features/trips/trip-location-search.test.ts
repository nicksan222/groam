import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseLocationResults, photonSearchUrl, searchLocations } from './trip-location-search';

afterEach(() => vi.unstubAllGlobals());

const lisbonFeature = {
  geometry: { coordinates: [-9.136_591_9, 38.707_750_7], type: 'Point' },
  properties: {
    country: 'Portugal',
    countrycode: 'PT',
    name: 'Lisbon',
    osm_id: 5_400_890,
    osm_type: 'R',
    osm_value: 'city',
    state: 'Lisbon'
  },
  type: 'Feature'
};

function defaultPhotonSearchUrl(query: string) {
  return photonSearchUrl(query, 'https://photon.komoot.io');
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('parseLocationResults', () => {
  test('normalizes real Photon GeoJSON places with stable OSM identity and coordinates', () => {
    expect(
      parseLocationResults({
        features: [
          {
            geometry: { coordinates: [-9.136_591_9, 38.707_750_7], type: 'Point' },
            properties: {
              country: 'Portugal',
              countrycode: 'PT',
              name: 'Lisbon',
              osm_id: 5_400_890,
              osm_type: 'R',
              osm_value: 'city',
              state: 'Lisbon'
            },
            type: 'Feature'
          },
          {
            geometry: { coordinates: [2.294_5, 48.858_26], type: 'Point' },
            properties: {
              city: 'Paris',
              country: 'France',
              countrycode: 'fr',
              name: 'Eiffel Tower',
              osm_id: 5_016_367,
              osm_type: 'W',
              osm_value: 'attraction'
            },
            type: 'Feature'
          }
        ],
        type: 'FeatureCollection'
      })
    ).toEqual([
      {
        context: 'Portugal',
        countryCode: 'PT',
        latitude: 38.707_750_7,
        longitude: -9.136_591_9,
        name: 'Lisbon, Portugal',
        placeId: 'R:5400890',
        type: 'City'
      },
      {
        context: 'Paris, France',
        countryCode: 'FR',
        latitude: 48.858_26,
        longitude: 2.294_5,
        name: 'Eiffel Tower, Paris, France',
        placeId: 'W:5016367',
        type: 'Attraction'
      }
    ]);
  });

  test('ignores malformed and duplicate features without throwing', () => {
    const feature = {
      geometry: { coordinates: [10, 20] },
      properties: { name: 'Place', osm_id: 1, osm_type: 'N' }
    };
    const invalidCoordinates = {
      ...feature,
      geometry: { coordinates: [181, 91] },
      properties: { ...feature.properties, osm_id: 2 }
    };
    expect(
      parseLocationResults({ features: [null, {}, invalidCoordinates, feature, feature] })
    ).toHaveLength(1);
    expect(parseLocationResults({ features: 'invalid' })).toEqual([]);
  });
});

describe('searchLocations', () => {
  test('queries Photon without following redirects and parses GeoJSON places', async () => {
    const body = { features: [lisbonFeature], type: 'FeatureCollection' };
    const fetchMock = stubFetch(new Response(JSON.stringify(body), { status: 200 }));
    const signal = new AbortController().signal;

    await expect(searchLocations('Lisbon', signal)).resolves.toEqual(parseLocationResults(body));
    expect(fetchMock).toHaveBeenCalledWith(defaultPhotonSearchUrl('Lisbon'), {
      headers: { Accept: 'application/geo+json, application/json' },
      redirect: 'error',
      signal
    });
  });

  test('encodes the query on the Photon URL', async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ features: [], type: 'FeatureCollection' }), { status: 200 })
    );
    const query = 'café & Lisbon';

    await expect(searchLocations(query, new AbortController().signal)).resolves.toEqual([]);
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).href).toBe(defaultPhotonSearchUrl(query).href);
    expect((url as URL).origin).toBe('https://photon.komoot.io');
  });

  test.each([401, 404, 503])('throws when Photon returns HTTP %s', async (status) => {
    stubFetch(new Response(null, { status }));
    await expect(searchLocations('Lisbon', new AbortController().signal)).rejects.toThrow(
      `Location search failed (${status})`
    );
  });

  test('returns no locations when Photon JSON is not a feature collection', async () => {
    stubFetch(new Response(JSON.stringify({ error: 'nope' }), { status: 200 }));
    await expect(searchLocations('Lisbon', new AbortController().signal)).resolves.toEqual([]);
  });

  test('rejects when Photon returns invalid JSON', async () => {
    stubFetch(new Response('not-json', { status: 200 }));
    await expect(searchLocations('Lisbon', new AbortController().signal)).rejects.toThrow();
  });

  test('forwards the abort signal to fetch', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(searchLocations('Lisbon', controller.signal)).rejects.toBe(abortError);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });

  test('explains when Photon cannot be reached', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchLocations('Lisbon', new AbortController().signal)).rejects.toThrow(
      /Place search is unavailable offline/
    );
  });

  test('builds a self-hosted Photon search URL', () => {
    expect(photonSearchUrl('Lisbon', 'http://127.0.0.1:2322').href).toBe(
      'http://127.0.0.1:2322/api/?q=Lisbon&limit=10&lang=en'
    );
  });
});
