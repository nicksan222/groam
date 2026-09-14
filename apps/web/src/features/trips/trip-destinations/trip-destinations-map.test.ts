import { describe, expect, test } from 'vitest';
import {
  destinationMapView,
  destinationRouteData
} from '@/features/trips/trip-destinations/trip-destinations-map-geometry';

const stop = (id: string, latitude: number, longitude: number) =>
  ({
    id,
    latitude,
    longitude
  }) as Parameters<typeof destinationMapView>[0][number];

describe('trip destination map view', () => {
  test('fits one stop tightly and bounds a multi-stop route', () => {
    expect(destinationMapView([])).toEqual({ latitude: 20, longitude: 0, zoom: 1.2 });
    expect(destinationMapView([stop('lisbon', 38.72, -9.14)])).toEqual({
      latitude: 38.72,
      longitude: -9.14,
      zoom: 8
    });
    expect(destinationMapView([stop('lisbon', 38.72, -9.14), stop('porto', 41.15, -8.61)])).toEqual(
      {
        bounds: [
          [-9.14, 38.72],
          [-8.61, 41.15]
        ],
        fitBoundsOptions: { padding: 70 }
      }
    );
    expect(
      destinationRouteData([stop('lisbon', 38.72, -9.14), stop('porto', 41.15, -8.61)])
    ).toEqual({
      geometry: {
        coordinates: [
          [-9.14, 38.72],
          [-8.61, 41.15]
        ],
        type: 'LineString'
      },
      properties: {},
      type: 'Feature'
    });
  });
});
